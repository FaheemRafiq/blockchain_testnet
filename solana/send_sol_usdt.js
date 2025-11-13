const {
  Connection,
  PublicKey,
  Keypair,
  clusterApiUrl,
} = require("@solana/web3.js");
const spl = require("@solana/spl-token");
const bs58 = require("bs58");
/**
 * Convert different private key formats to Keypair:
 * - JSON array string (e.g. "[1,2,3,...]")
 * - base58 string
 * - hex string
 */
function keypairFromSecretRaw(raw) {
  if (!raw) throw new Error("PRIVATE_KEY not provided");

  // If looks like JSON array
  if (/^\s*\[/.test(raw)) {
    const arr = JSON.parse(raw);
    return Keypair.fromSecretKey(Uint8Array.from(arr));
  }

  // If hex string
  if (/^[0-9a-fA-F]+$/.test(raw)) {
    const buf = Buffer.from(raw, "hex");
    return Keypair.fromSecretKey(Uint8Array.from(buf));
  }

  // Otherwise assume base58; handle module shape differences
  let decoded;
  try {
    // common case
    if (typeof bs58.decode === "function") {
      decoded = bs58.decode(raw);
    } else if (bs58 && typeof bs58 === "function") {
      // some builds export the function itself
      decoded = bs58(raw);
    } else if (
      bs58 &&
      bs58.default &&
      typeof bs58.default.decode === "function"
    ) {
      decoded = bs58.default.decode(raw);
    } else {
      throw new Error("bs58 decode not available in this runtime");
    }
    return Keypair.fromSecretKey(Uint8Array.from(decoded));
  } catch (err) {
    throw new Error("Failed to decode private key (base58). " + err.message);
  }
}

async function main() {
  // ---------- CONFIG ----------
  const PRIVATE_KEY_RAW =
    process.env.PRIVATE_KEY ||
    "2RjLGpnn7kcDDrSkjvgEkyvjKxZ2SGjeZKbZ7n3SbPz1DM2rYzqo6S9kzTAjhMiyFJKPYju4UGJ6i7rW3isHKCzh"; // base58 | hex | JSON array
  const RECIPIENT =
    process.env.RECIPIENT || "A7rqWKWCo6ykAcFQcu7oeqVm18YgP3jmwCdc5F7iVEiT"; // recipient pubkey
  const NETWORK = process.env.NETWORK || "devnet";
  const TOKEN_MINT =
    process.env.TOKEN_MINT || "F8xYJF9EvTHSiuXDkuzyXNUfwXM6t6ep9K38xe58Fieu"; // USDT mint
  const AMOUNT = parseFloat(process.env.AMOUNT || "1"); // amount in token units (not smallest units)

  if (!PRIVATE_KEY_RAW) throw new Error("Set PRIVATE_KEY env var");
  if (!RECIPIENT) throw new Error("Set RECIPIENT env var");

  // 1. Connection
  const connection = new Connection(clusterApiUrl(NETWORK), "confirmed");

  // 2. Keypair
  const sender = keypairFromSecretRaw(PRIVATE_KEY_RAW);
  console.log("Sender:", sender.publicKey.toBase58());

  // 3. Mint & recipient
  const mintPub = new PublicKey(TOKEN_MINT);
  const recipientPub = new PublicKey(RECIPIENT);

  // 4. Get token decimals
  const mintInfo = await spl.getMint(connection, mintPub);
  const decimals = mintInfo.decimals;
  console.log("Token decimals:", decimals);

  // 5. Get or create associated token accounts (sender and recipient)
  const senderATA = await spl.getOrCreateAssociatedTokenAccount(
    connection,
    sender, // payer / fee payer keypair
    mintPub,
    sender.publicKey
  );

  const recipientATA = await spl.getOrCreateAssociatedTokenAccount(
    connection,
    sender, // payer creates recipient ATA (sender pays fee)
    mintPub,
    recipientPub
  );

  console.log("Sender ATA:", senderATA.address.toBase58());
  console.log("Recipient ATA:", recipientATA.address.toBase58());

  // 6. Convert amount
  const amountSmallest = BigInt(Math.round(AMOUNT * 10 ** decimals));

  // 7. Perform transfer
  const txSig = await spl.transfer(
    connection,
    sender, // payer & signing authority
    senderATA.address,
    recipientATA.address,
    sender.publicKey,
    amountSmallest
  );

  console.log("✅ Transfer successful:", txSig);
  console.log(`Explorer: https://solscan.io/tx/${txSig}?cluster=${NETWORK}`);
}

main().catch((err) => {
  console.error("Error sending USDT:", err.message || err);
  process.exit(1);
});