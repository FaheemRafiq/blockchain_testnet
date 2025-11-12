const { TronWeb } = require('tronweb');

// Initialize TronWeb (you can use any node, just for wallet generation)
const tronWeb = new TronWeb({
    fullHost: 'https://api.trongrid.io'
});

// Generate a random TRON wallet
async function createRandomTronWallet() {
    try {
        // Create a new account
        const account = await tronWeb.createAccount();
        
        console.log('=== TRON Wallet Generated ===\n');
        console.log('Address (Base58):', account.address.base58);
        console.log('Address (Hex):', account.address.hex);
        console.log('Private Key:', account.privateKey);
        console.log('Public Key:', account.publicKey);
        console.log('\n⚠️  IMPORTANT: Keep your private key secure and never share it!');
        
        return account;
    } catch (error) {
        console.error('Error generating wallet:', error.message);
    }
}


function createWalletSync() {
    const account = tronWeb.createRandom();
    
    console.log('\n=== Alternative Method (Sync) ===\n');
    console.log('Address:', account.address);
    console.log('Private Key:', account.privateKey);
    
    return account;
}


createRandomTronWallet();

createWalletSync();