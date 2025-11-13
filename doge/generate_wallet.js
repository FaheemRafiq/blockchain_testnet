const bitcore = require('bitcore-lib-doge');

function generateWallet() {
  // Use Dogecoin testnet
  const network = bitcore.Networks.testnet;

  // Generate a new private key
  const privateKey = new bitcore.PrivateKey(null, network);

  // Get the corresponding WIF (Wallet Import Format)
  const wif = privateKey.toWIF();

  // Get the address
  const address = privateKey.toAddress(network);

  console.log('New Dogecoin Testnet Wallet:');
  console.log('-----------------------------');
  console.log('Address:', address.toString());
  console.log('Private Key (WIF):', wif);
  console.log('\nIMPORTANT: Keep your private key secure. Anyone with this key can access your funds.');
}

generateWallet();
