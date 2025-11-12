const { TronWeb } = require('tronweb');

// Configuration
const PRIVATE_KEY = 'd9102eb656d239b00c8ea8622563fb705a859f8d8164e884509253086be4d278'; // Replace with the sender's private key
const TOKEN_ADDRESS = 'TDPgDew2tC6BwqY3psfWPtVCJNr91emZP6'; // Token contract address
const RECIPIENT_ADDRESS = 'TMpvMtoSjMw92561Age48hez8pqUKisz5S'; // Recipient address
const AMOUNT_TO_SEND = 100; // Amount of tokens to send
const TOKEN_DECIMALS = 16; // Decimals of the token

// TronWeb setup for Shasta testnet
const tronWeb = new TronWeb(
  'https://api.shasta.trongrid.io', // Full node
  'https://api.shasta.trongrid.io', // Solidity node
  'https://api.shasta.trongrid.io', // Event server
  PRIVATE_KEY
);

async function sendTRC20Token() {
  try {
    console.log('Starting TRC-20 token transfer...\n');

    // Set the sender account
    tronWeb.setAddress(tronWeb.address.fromPrivateKey(PRIVATE_KEY));

    // Load the token contract
    const contract = await tronWeb.contract().at(TOKEN_ADDRESS);

    // Calculate the amount in smallest unit (with decimals)
    const amount = tronWeb.toBigNumber(AMOUNT_TO_SEND).times(Math.pow(10, TOKEN_DECIMALS)).toString();

    console.log(`Sending ${AMOUNT_TO_SEND} tokens to ${RECIPIENT_ADDRESS}...`);

    // Trigger the token transfer
    const transaction = await contract.transfer(RECIPIENT_ADDRESS, amount).send();

    console.log('\n✓ Token transfer initiated successfully!');
    console.log('Transaction ID:', transaction);
    console.log(`View on Tronscan: https://shasta.tronscan.org/#/transaction/${transaction}`);

    return transaction;

  } catch (error) {
    console.log(error)
    console.error('Error:', error.message);
    throw error;
  }
}

// Run the token transfer
sendTRC20Token()
  .then(() => {
    console.log('\nToken transfer completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nToken transfer failed:', error.message);
    process.exit(1);
  });
