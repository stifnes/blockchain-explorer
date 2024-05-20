const struct = require('buffer-layout'); // Assuming you have a library like buffer-layout to handle binary data parsing

const blockData = [];

function readVarint(data, offset) {
  const value = data[offset];
  if (value < 0xfd) {
    return { value, bytesRead: 1 };
  } else if (value === 0xfd) {
    return { value: struct.readUInt16BE(data, offset + 1), bytesRead: 3 };
  } else if (value === 0xfe) {
    return { value: struct.readUInt32BE(data, offset + 1), bytesRead: 5 };
  } else {
    return { value: struct.readBigUInt64BE(data, offset + 1), bytesRead: 9 };
  }
}

function parseTransaction(payload, offset) {
  const txVersion = struct.readUInt32BE(payload, offset);
  offset += 4;

  const { value: numInputs, bytesRead: varintSize } = readVarint(payload, offset);
  offset += varintSize;

  const inputs = [];
  for (let i = 0; i < numInputs; i++) {
    const txid = payload.slice(offset, offset + 32);
    offset += 32;
    const vout = struct.readUInt32BE(payload, offset);
    offset += 4;
    const { value: scriptLen, bytesRead: scriptVarintSize } = readVarint(payload, offset);
    offset += scriptVarintSize;
    const scriptSig = payload.slice(offset, offset + scriptLen);
    offset += scriptLen;
    const sequence = struct.readUInt32BE(payload, offset);
    offset += 4;
    inputs.push({ txid, vout, scriptSig, sequence });
  }

  const { value: numOutputs, bytesRead: outputVarintSize } = readVarint(payload, offset);
  offset += outputVarintSize;

  const outputs = [];
  for (let i = 0; i < numOutputs; i++) {
    const value = struct.readBigUInt64BE(payload, offset);
    offset += 8;
    const { value: scriptLen, bytesRead: scriptVarintSize } = readVarint(payload, offset);
    offset += scriptVarintSize;
    const scriptPubkey = payload.slice(offset, offset + scriptLen);
    offset += scriptLen;
    outputs.push({ value, scriptPubkey });
  }

  const locktime = struct.readUInt32BE(payload, offset);
  offset += 4;

  return {
    version: txVersion,
    inputs,
    outputs,
    locktime,
  };
}

function parseBlockMessage(payload) {
  const blockDetails = {};
  blockDetails.version = struct.readUInt32BE(payload, 0);
  blockDetails.prevBlock = payload.slice(4, 36);
  blockDetails.merkleRoot = payload.slice(36, 68);
  blockDetails.timestamp = struct.readUInt32BE(payload, 68);
  blockDetails.bits = struct.readUInt32BE(payload, 72);
  blockDetails.nonce = struct.readUInt32BE(payload, 76);

  let offset = 80;
  const { value: txCount, bytesRead: varintSize } = readVarint(payload, offset);
  offset += varintSize;

  const transactions = [];
  for (let i = 0; i < txCount; i++) {
    const tx = parseTransaction(payload, offset);
    transactions.push(tx);
    offset = tx.offset; // Update offset based on the parsed transaction
  }

  blockDetails.transactions = transactions;

  // Calculate the block hash (similar logic to Python code)
  const blockHeader = payload.slice(0, 80);
  const hashBuffer = crypto.createHash('sha256').update(crypto.createHash('sha256').update(blockHeader).digest()).digest();
  blockDetails.hash = hashBuffer.reverse().toString('hex');

  // Check that the calculated hash matches the expected hash (similar logic to Python code)

  return blockDetails;
}

function displayBlockInfo(blockDetails) {
  const timestamp = new Date(blockDetails.timestamp * 1000).toUTCString();
  const blockInfo = {
      timestamp: timestamp,
      nonce: blockDetails.nonce,
      difficulty: blockDetails.bits,
      hash: blockDetails.hash,
      transactions: blockDetails.transactions.map(tx => {
          return {
              version: tx.version,
              outputs: tx.outputs.map(out => {
                  return { value: out[0] / 100000000 };
              })
          };
      })
  };
  blockData.push(blockInfo);
  console.log(`Block mined on ${timestamp}`);
  console.log(`Nonce: ${blockDetails.nonce}`);
  console.log(`Difficulty: ${blockDetails.bits}`);
  console.log(`Block Hash: ${blockDetails.hash}`);
  console.log("Transactions:");
  blockDetails.transactions.forEach(tx => {
      console.log(`  Transaction Version: ${tx.version}`);
      console.log("  Outputs:");
      tx.outputs.forEach((out, idx) => {
          const btcValue = out[0] / 100000000;
          console.log(`    ${idx + 1}. Output Value: ${btcValue.toFixed(8)} BTC`);
      });
  });
}