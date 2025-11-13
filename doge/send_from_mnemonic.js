const bitcore = require('bitcore-lib-doge');
const bitcoreMnemonic = require('bitcore-mnemonic');
const axios = require('axios');

// -- START OF CONFIGURATION --

// 1. Your Mnemonic Phrase
// IMPORTANT: Replace this with your actual mnemonic phrase.
// This phrase will be used to derive your Dogecoin mainnet wallet.
const MNEMONIC = 'diet shine shoot fall cream awake rare response cliff device public material';

// 2. Recipient Address
// Replace this with the Dogecoin mainnet address you want to send DOGE to.
const TO_ADDRESS = 'D79Q21822222222222222222222222222222222222'; // Example Mainnet Address - REPLACE

// 3. Amount to Send
// The amount of DOGE to send, in dogetoshis (1 DOGE = 100,000,000 dogetoshis).
const AMOUNT_TO_SEND = 0.1 * 100000000; // 0.1 DOGE

// 4. Transaction Fee
// The transaction fee in dogetoshis. Adjust as needed.
const FEE = 1 * 100000000; // 1 DOGE fee (can be adjusted)

// -- END OF CONFIGURATION --

const NETWORK = bitcore.Networks.mainnet;
const API_BASE = 'https://sochain.com/api/v2';

// Function to get Unspent Transaction Outputs (UTXOs)
async function getUTXOs(address) {
  try {
    const response = await axios.get(`${API_BASE}/get_tx_unspent/DOGE/${address}`);
    if (response.data.data.txs.length === 0) {
      throw new Error(`No UTXOs found for address ${address}. Please ensure it has funds.`);
    }
    return response.data.data.txs;
  } catch (error) {
    console.error('Error fetching UTXOs:', error.response ? error.response.data : error.message);
    throw new Error('Failed to fetch UTXOs.');
  }
}

// Function to broadcast the transaction
async function broadcastTransaction(txHex) {
  try {
    const response = await axios.post(`${API_BASE}/send_tx/DOGE`, { tx_hex: txHex });
    return response.data.data;
  } catch (error) {
    console.error('Error broadcasting transaction:', error.response ? error.response.data : error.message);
    throw new Error('Failed to broadcast transaction.');
  }
}

async function createAndSendTransactionFromMnemonic() {
  try {
    console.log('Starting Dogecoin mainnet transaction from mnemonic...\n');

    // 1. Derive wallet from mnemonic
    const code = new bitcoreMnemonic(MNEMONIC);
    if (!bitcoreMnemonic.isValid(MNEMONIC)) {
        throw new Error('Invalid mnemonic phrase provided.');
    }
    const xpriv = code.toHDPrivateKey(null, NETWORK);
    const privateKey = xpriv.derive("m/44'/3'/0'/0/0").privateKey; // Standard derivation path for Dogecoin
    const fromAddress = privateKey.toAddress(NETWORK);

    console.log(`Derived Sender Address: ${fromAddress.toString()}`);
    console.log(`Derived Private Key (WIF): ${privateKey.toWIF()}`); // For debugging, keep secure!

    // 2. Get UTXOs for the sender address
    console.log('Fetching UTXOs...');
    const utxos = await getUTXOs(fromAddress.toString());
    console.log(`Found ${utxos.length} UTXO(s).`);

    // Map SoChain UTXOs to bitcore format
    const bitcoreUtxos = utxos.map(utxo => new bitcore.Transaction.UnspentOutput({
      txid: utxo.txid,
      vout: utxo.output_no,
      address: fromAddress.toString(),
      script: utxo.script_hex,
      satoshis: Math.round(parseFloat(utxo.value) * 100000000) // Convert DOGE to dogetoshis
    }));

    // 3. Calculate total input amount and change
    const totalInput = bitcoreUtxos.reduce((acc, utxo) => acc + utxo.satoshis, 0);
    const requiredAmount = AMOUNT_TO_SEND + FEE;

    if (totalInput < requiredAmount) {
      throw new Error(`Insufficient funds. Required: ${requiredAmount / 100000000} DOGE (Amount + Fee). Available: ${totalInput / 100000000} DOGE`);
    }

    const changeAmount = totalInput - requiredAmount;

    console.log(`Total funds in wallet: ${totalInput / 100000000} DOGE`);
    console.log(`Amount to send: ${AMOUNT_TO_SEND / 100000000} DOGE`);
    console.log(`Transaction Fee: ${FEE / 100000000} DOGE`);
    console.log(`Change to be returned: ${changeAmount / 100000000} DOGE`);

    // 4. Create and sign the transaction
    const transaction = new bitcore.Transaction()
      .from(bitcoreUtxos)
      .to(TO_ADDRESS, AMOUNT_TO_SEND)
      .change(fromAddress) // Automatically handles change
      .fee(FEE)
      .sign(privateKey);

    console.log('\nTransaction created successfully!');
    
    // 5. Broadcast transaction
    const txHex = transaction.serialize();
    console.log('Broadcasting transaction...');
    const result = await broadcastTransaction(txHex);

    console.log('\n✓ Transaction broadcast successfully!');
    console.log(`Transaction ID: ${result.txid}`);
    console.log(`View on explorer: https://sochain.com/tx/DOGE/${result.txid}`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the transaction
createAndSendTransactionFromMnemonic();
