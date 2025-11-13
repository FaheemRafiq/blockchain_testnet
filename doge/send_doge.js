const bitcore = require('bitcore-lib-doge');
const axios = require('axios');

// -- START OF CONFIGURATION --

// 1. Recipient Address
// Replace this with the address you want to send DOGE to.
const TO_ADDRESS = 'nZGRHq432s3jqx2sJgqQ2o1i4S3eQ8f1aB'; // Example Testnet Address

// 2. Sender's Private Key (WIF)
// Replace this with the private key of your sender's wallet.
// This key is used to sign the transaction.
const SENDER_WIF = 'ci5p234Q1KbjrARz4h6aC29gAZ3M9a3T5p3s4q6w7e8r9t0u1v2w'; // Example WIF - REPLACE

// 3. Amount to Send
// The amount of DOGE to send, in dogetoshis (1 DOGE = 100,000,000 dogetoshis).
const AMOUNT_TO_SEND = 1 * 100000000; // 1 DOGE

// -- END OF CONFIGURATION --

const NETWORK = bitcore.Networks.testnet;
const API_BASE = 'https://sochain.com/api/v2';

// Function to get Unspent Transaction Outputs (UTXOs)
async function getUTXOs(address) {
  try {
    const response = await axios.get(`${API_BASE}/get_tx_unspent/DOGETEST/${address}`);
    return response.data.data.txs;
  } catch (error) {
    console.error('Error fetching UTXOs:', error.response ? error.response.data : error.message);
    throw new Error('Failed to fetch UTXOs.');
  }
}

// Function to broadcast the transaction
async function broadcastTransaction(txHex) {
  try {
    const response = await axios.post(`${API_BASE}/send_tx/DOGETEST`, { tx_hex: txHex });
    return response.data.data;
  } catch (error) {
    console.error('Error broadcasting transaction:', error.response ? error.response.data : error.message);
    throw new Error('Failed to broadcast transaction.');
  }
}

async function createAndSendTransaction() {
  try {
    console.log('Starting Dogecoin transaction...\n');

    // Import the private key
    const privateKey = new bitcore.PrivateKey(SENDER_WIF, NETWORK);
    const fromAddress = privateKey.toAddress(NETWORK);
    console.log(`Sender Address: ${fromAddress}`);

    // Get UTXOs for the sender address
    console.log('Fetching UTXOs...');
    const utxos = await getUTXOs(fromAddress.toString());

    if (!utxos || utxos.length === 0) {
      throw new Error('No UTXOs found for this address. You may need to fund it first.');
    }
    console.log(`Found ${utxos.length} UTXO(s).`);

    // Map SoChain UTXOs to bitcore format
    const bitcoreUtxos = utxos.map(utxo => new bitcore.Transaction.UnspentOutput({
      txid: utxo.txid,
      vout: utxo.output_no,
      address: fromAddress.toString(),
      script: utxo.script_hex,
      satoshis: Math.round(parseFloat(utxo.value) * 100000000) // Convert DOGE to dogetoshis
    }));

    // Calculate total input amount and transaction fee
    const totalInput = bitcoreUtxos.reduce((acc, utxo) => acc + utxo.satoshis, 0);
    const fee = 100000000; // 1 DOGE fee (can be adjusted)
    console.log(`Total funds in wallet: ${totalInput / 100000000} DOGE`);

    // Calculate change
    const changeAmount = totalInput - AMOUNT_TO_SEND - fee;
    if (changeAmount < 0) {
      throw new Error(`Insufficient funds. Required: ${AMOUNT_TO_SEND / 100000000} DOGE + Fee: ${fee / 100000000} DOGE. Available: ${totalInput / 100000000} DOGE`);
    }
    console.log(`Amount to send: ${AMOUNT_TO_SEND / 100000000} DOGE`);
    console.log(`Transaction Fee: ${fee / 100000000} DOGE`);
    console.log(`Change to be returned: ${changeAmount / 100000000} DOGE`);

    // Create a new transaction
    const transaction = new bitcore.Transaction()
      .from(bitcoreUtxos)
      .to(TO_ADDRESS, AMOUNT_TO_SEND)
      .change(fromAddress) // Automatically handles change
      .fee(fee)
      .sign(privateKey);

    console.log('\nTransaction created successfully!');
    
    // Broadcast transaction
    const txHex = transaction.serialize();
    console.log('Broadcasting transaction...');
    const result = await broadcastTransaction(txHex);

    console.log('\n✓ Transaction broadcast successfully!');
    console.log(`Transaction ID: ${result.txid}`);
    console.log(`View on explorer: https://sochain.com/tx/DOGETEST/${result.txid}`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the transaction
createAndSendTransaction();
