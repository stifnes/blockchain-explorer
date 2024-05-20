const express = require('express');
const app = express();
const http = require('http').Server(app);

const net = require("net");
const client = new net.Socket();
const crypto = require("crypto");

const { parseBlockMessage, displayBlockInfo } = require('./data-parsing.js');

const network = { magic: "d9b4bef9", port: 8333, ip: '34.126.120.20' }

let blockData = [];

const reverse = (d) => Buffer.from(d.toString("hex"), "hex").reverse();
const sha256 = (data) => crypto.createHash("sha256").update(data).digest();

const getVersionPayload = () => {
  const version = reverse(
    Buffer.from(Number(31900).toString(16).padStart(8, "0"), "hex")
  );
  const services = Buffer.from("0".repeat(16), "hex");
  const timestamp = Buffer.from("0".repeat(16), "hex");
  const addrRecv = Buffer.from("0".repeat(52), "hex");
  const addrFrom = Buffer.from("0".repeat(52), "hex");
  const nonce = crypto.randomBytes(8);
  const userAgent = Buffer.from("\x0f/Satoshi:0.7.2", "utf-8");
  const startHeight = Buffer.from("0".repeat(8), "hex");
  const relay = Buffer.from("0".repeat(2), "hex");
  const payload = Buffer.concat([
    version,
    services,
    timestamp,
    addrRecv,
    addrFrom,
    nonce,
    userAgent,
    startHeight,
    relay,
  ]);
  return payload;
};

const handleHeader = async (index, data) => {
	const magic = reverse(data.subarray(index, index + 4)).toString('hex')
	const command = data.subarray(index + 4, index + 16).toString()
	const length = parseInt(reverse(data.subarray(index + 16, index + 20)).toString('hex'), 16)
	const checksum = data.subarray(index + 20, index + 24)
	const payload = data.subarray(index + 24, index + 24 + length)
	return { magic, length, checksum, payload, command }
}



const getMessage = (type, payload) => {
  const magic = reverse(Buffer.from(network.magic, "hex"));
  const command = Buffer.from(
    Buffer.from(type, "utf-8").toString("hex").padEnd(24, "0"),
    "hex"
  );
  const length = Buffer.from(
    Number(payload.length).toString(16).padEnd(8, "0"),
    "hex"
  );
  const checksum = sha256(sha256(payload)).subarray(0, 4);
  return Buffer.concat([magic, command, length, checksum, payload]);
};

function printInventory(data) {
  let offset = 0
  const count = parseInt(
    reverse(data.slice(offset, offset + 1)).toString('hex'),
    16,
  ) //1byte
  console.log('count :' + count)

  while (offset + 36 < data.length) {
    const type = parseInt(
      reverse(data.slice(offset + 1, offset + 5)).toString('hex'),
      16,
    )
    const hash = reverse(data.slice(offset + 5, offset + 37)).toString('hex') //36byte
    console.log(`{ type: ${type}, hash:${hash} }`) //type :1 (tx) , type:2 (block)
    offset += 36 // Move to the next item
  }
}



function printAddr(data) {
  let offset = 0
  const count = decodeVarInt(data) //calculate the count number
  console.log('Number of Addresses:', count.count)

  const addresses = []
  offset = count.offset

  while (offset + 30 < data.length) {
    const timestamp = new Date(
      parseInt(reverse(data.slice(offset, offset + 4)).toString('hex'), 16) *
        1000,
    ).toISOString()

    const services = reverse(data.slice(offset + 4, offset + 12)).toString(
      'hex',
    )
    // IPv4 to IPv6:
    const address = parseIP(data.slice(offset + 12, offset + 28))

    const port = parseInt(
      reverse(data.slice(offset + 28, offset + 30)).toString('hex'),
      16,
    )
    addresses.push({
      timestamp: timestamp,
      services: services,
      address: address,
      port: port,
    })
    offset += 30
  }
}

function parseIP(rawAddress) {
  //if the first 10 bytes are all 0 and the next 2 bytes are both 255(0xff),
  //it indicates that the address is an Ipv4 address. Otherwise, it will bew parsed as Ipv6.
  const isIPv4 =
    rawAddress.slice(0, 10).every((b) => b === 0) &&
    rawAddress.slice(10, 12).every((b) => b === 0xff)

  if (isIPv4) {
    return rawAddress.slice(12, 16).join('.')
  } else {
    let ipv6 = []
    for (let i = 0; i < 16; i += 2) {
      ipv6.push(rawAddress.slice(i, i + 2).toString('hex'))
    }

    return ipv6.join(':')
  }
}

function decodeVarInt(data) {
  let count = 0
  let offset = 0
  const firstByte = parseInt(
    reverse(data.slice(0, offset + 1)).toString('hex'),
    16,
  )
  //if 1byte
  if (firstByte < 0xfd) {
    count = firstByte
    offset = 1
  } else if (firstByte === 0xfd) {
    //if 2byte
    count = parseInt(reverse(data.slice(0, offset + 2)).toString('hex'), 16)
    offset = 3
  } else if (firstByte === 0xfe) {
    //if 3byte
    count = parseInt(reverse(data.slice(0, offset + 4)).toString('hex'), 16)
    offset = 5
  }
  return { count, offset }
}

const handleMessage = async (command, payload) => {
	command = command.replace(/\0/g, '')

	if (command?.startsWith('version')) {
		console.log('Sent: verack', command)
		client.write(getMessage('verack', Buffer.alloc(0)))
	} else if (command == 'verack') {
    console.log('Verack received, connection established.')
    client.write(getMessage('getaddr', Buffer.alloc(0))) //send getaddr
  } else if (command === 'inv') {
    console.log('Received inventory message:')
    printInventory(payload)
  } else if (command === 'block') {
    block_details = parseBlockMessage(payload)
    blockData = displayBlockInfo(block_details)
  } else if (command === 'addr') {
    console.log('Received addr message:')
    printAddr(payload)
	} else if (command?.startsWith('ping')) {
		console.log('Sent: pong', payload)
		client.write(getMessage('pong', payload))
	} else if (command === 'pong') {
    console.log('Pong received, connection established.')
  }
}

function sendPing() {
  const nonce = crypto.randomBytes(8)
  client.write(getMessage('ping', nonce))
  console.log('Ping has been sent')
}

(async () => {
  client.connect(network.port, network.ip, () => {
    console.log(`Connected to ${network.ip}`);
    client.write(getMessage("version", getVersionPayload()));
  });

	let savedData = Buffer.alloc(0)
  client.on("data", async (data) => {
    let index = 0;

		const newData = Buffer.concat([savedData, data])
    while (index < newData.length) {
			const { length, command, payload } = await handleHeader(index, newData)
			console.log('Received:', command)

			await handleMessage(command, payload)
			index += 24 + length
		}

		// store pending data
		savedData = newData.subarray(index)
  });
	setInterval(() => {
    sendPing() //Check connection every 30 sec
  }, 30000)
})();

app.get('/', (req, res) => {
	res.render('home.ejs', {
		blockData: blockData
	});
});

// Start the server
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
