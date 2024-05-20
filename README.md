# blockchain-explorer

This is a blockchain explorer project that allows you to explore and analyze blockchain data.

## Explanation

1.  Imports and Initialization:

    -   The code imports necessary modules such as `net` for networking and `crypto` for cryptographic operations.
    -   It defines a `network` object containing information about the Bitcoin network, such as magic bytes, port, and IP address.
2.  Functions for Message Handling:

    -   `getVersionPayload()`: Constructs a payload for the version message, which is sent when initiating a connection.
    -   `getMessage(type, payload)`: Constructs a message by appending magic bytes, command, length, checksum, and payload.
    -   `handleHeader(index, data)`: Parses message headers to extract information like magic bytes, command, length, checksum, and payload.
    -   `printInventory(data)`: Parses and prints inventory data received in the 'inv' message.
    -   `printAddr(data)`: Parses and prints address data received in the 'addr' message.
    -   `parseIP(rawAddress)`: Parses raw address data into IPv4 or IPv6 format.
    -   `decodeVarInt(data)`: Decodes variable-length integers used in Bitcoin messages.
    -   `parseBlockMessage(payload)`: function extracts block header and transaction data from a block message payload.
    -   `parseTransaction(payload)`: function extracts transaction data from a block message payload.
    -   `displayBlockInfo(blockdetails)`: function formats and displays information about a parsed block.
3.  Message Handling Function (`handleMessage()`):

    -   Handles different types of messages such as version, verack, inv, addr, block, ping, and pong. It responds accordingly, such as sending a verack message after receiving a version message, printing inventory or address data, or responding to ping messages with pong messages.
4.  Connection Setup and Event Handling:

    -   The script establishes a TCP connection to a Bitcoin node using the `net.Socket()` class.
    -   On connection, it sends a version message and listens for incoming data.
    -   It parses incoming data into messages and calls the `handleMessage()` function to process them.
    -   It periodically sends ping messages to check the connection status.

## Installation

1. Clone the repository:
  ```bash
  git clone https://github.com/your-username/blockchain-explorer.git
  ```

2. Navigate to the project directory:
  ```bash
  cd blockchain-explorer
  ```

3. Install the dependencies:
  ```bash
  npm install
  ```

## Usage

1. Start the blockchain explorer:
  ```bash
  npm run start
  ```

2. Working functionality visible in the terminal


## Contributing

Contributions are welcome! If you find any issues or have suggestions for improvements, please open an issue or submit a pull request.
