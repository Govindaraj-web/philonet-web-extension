import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the private key
const keyPath = path.join(__dirname, 'chrome-extension', 'key.pem');
const privateKeyPem = fs.readFileSync(keyPath, 'utf8');

try {
  // Create private key object
  const privateKeyObj = crypto.createPrivateKey({
    key: privateKeyPem,
    format: 'pem',
    type: 'pkcs8'
  });

  // Extract public key in DER format
  const publicKeyDer = crypto.createPublicKey(privateKeyObj).export({
    format: 'der',
    type: 'spki'
  });

  // Generate SHA256 hash of the public key DER
  const sha256Hash = crypto.createHash('sha256').update(publicKeyDer).digest();

  // Take first 16 bytes and convert to Chrome extension ID format
  const extensionIdBytes = sha256Hash.slice(0, 16);
  let extensionId = '';
  for (let i = 0; i < extensionIdBytes.length; i++) {
    const value = extensionIdBytes[i] & 0x0f; // Take lower 4 bits (0-15)
    extensionId += String.fromCharCode(97 + value); // Convert to 'a'-'p'
  }

  console.log('Extension ID:', extensionId);
  console.log('\nThis is the fixed extension ID that will be generated from your private key.');
  console.log('You can use this ID in your OAuth configuration and other services.');
  console.log('\nNext steps:');
  console.log('1. Update your Google OAuth client configuration to include this extension ID');
  console.log('2. Build and load your extension - it will always have this same ID');
  console.log('3. The private key is already added to .gitignore for security');

} catch (error) {
  console.error('Error generating extension ID:', error.message);
  console.log('\nMake sure the private key was generated correctly.');
}
