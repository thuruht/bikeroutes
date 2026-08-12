const DB_NAME = 'br-dm-keys';
const STORE_NAME = 'identity';
const KEY_ID = 'pair';

function ab2b64(buf) {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function b642ab(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function getStoredPair() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(KEY_ID);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function saveStoredPair(pair) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(pair, KEY_ID);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function hasStoredKeys() {
  const pair = await getStoredPair();
  return !!(pair?.privateKey && pair?.publicKey);
}

async function generateIdentityKeys() {
  const pair = await crypto.subtle.generateKey(
    { name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['wrapKey', 'unwrapKey']
  );
  const publicB64 = ab2b64(await crypto.subtle.exportKey('spki', pair.publicKey));
  await saveStoredPair(pair);
  return { pair, publicB64 };
}

export async function uploadPublicKey(b64) {
  const token = localStorage.getItem('br-session');
  if (!token) return;
  const r = await fetch('/api/auth/public-key', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ public_key: b64 }),
  });
  if (!r.ok) throw new Error('failed to upload public key');
}

/** Ensure this device has keys. Returns { pair, publicB64 } or { needsRestore: true }.
 *  If the server has a backup but this device has no matching local keys, we do not
 *  overwrite the server key; the user must restore from backup. */
export async function ensureKeys(user) {
  if (!user) return null;
  const stored = await getStoredPair();

  if (stored?.publicKey) {
    const localB64 = ab2b64(await crypto.subtle.exportKey('spki', stored.publicKey));
    if (user.public_key && user.public_key === localB64) return { pair: stored, publicB64: localB64 };
    // Server has a different public key and possibly a backup. Don't overwrite blindly.
    if (user.public_key && user.encrypted_private_key) {
      return { needsRestore: true };
    }
    // No backup or no server key: publish local key.
    await uploadPublicKey(localB64);
    return { pair: stored, publicB64: localB64 };
  }

  if (user.public_key) {
    // Server has a key but this device does not have the private half.
    if (user.encrypted_private_key) {
      return { needsRestore: true };
    }
    // Legacy: no backup available. Generate a fresh device key.
    const { pair, publicB64 } = await generateIdentityKeys();
    await uploadPublicKey(publicB64);
    return { pair, publicB64 };
  }

  const { pair, publicB64 } = await generateIdentityKeys();
  await uploadPublicKey(publicB64);
  return { pair, publicB64 };
}

async function importPublicKey(b64) {
  return crypto.subtle.importKey(
    'spki',
    b642ab(b64),
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['wrapKey']
  );
}

async function deriveKey(passphrase, saltBuffer) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(passphrase), { name: 'PBKDF2' }, false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: saltBuffer, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/** Export local identity keys as an encrypted backup payload. */
export async function exportBackup(passphrase) {
  const pair = await getStoredPair();
  if (!pair?.privateKey || !pair?.publicKey) throw new Error('No local keys to back up');
  const pubB64 = ab2b64(await crypto.subtle.exportKey('spki', pair.publicKey));
  const privB64 = ab2b64(await crypto.subtle.exportKey('pkcs8', pair.privateKey));
  const plaintext = new TextEncoder().encode(JSON.stringify({ publicKey: pubB64, privateKey: privB64 }));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const aesKey = await deriveKey(passphrase, salt);
  const cipherBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, plaintext);
  return JSON.stringify({ v: 1, salt: ab2b64(salt), iv: ab2b64(iv), ct: ab2b64(cipherBuffer) });
}

/** Restore identity keys from an encrypted backup payload. Returns the public key base64. */
export async function importBackup(passphrase, backupJson) {
  const payload = JSON.parse(backupJson);
  if (payload.v !== 1 || !payload.ct || !payload.iv || !payload.salt) throw new Error('Invalid backup');
  const aesKey = await deriveKey(passphrase, b642ab(payload.salt));
  const plainBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b642ab(payload.iv) },
    aesKey,
    b642ab(payload.ct)
  );
  const plain = JSON.parse(new TextDecoder().decode(plainBuffer));
  const publicKey = await crypto.subtle.importKey(
    'spki',
    b642ab(plain.publicKey),
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    true,
    ['wrapKey']
  );
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    b642ab(plain.privateKey),
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    true,
    ['unwrapKey']
  );
  await saveStoredPair({ publicKey, privateKey });
  return ab2b64(await crypto.subtle.exportKey('spki', publicKey));
}

/** Encrypt a plaintext message for both sender and recipient. */
export async function encryptMessage(plaintext, recipientPublicKeyB64, senderPublicKeyB64, recipientId, senderId) {
  const aesKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintextBytes = new TextEncoder().encode(plaintext);
  const cipherBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, plaintextBytes);

  const [recipientPub, senderPub] = await Promise.all([
    importPublicKey(recipientPublicKeyB64),
    importPublicKey(senderPublicKeyB64),
  ]);

  const [recipientWrapped, senderWrapped] = await Promise.all([
    crypto.subtle.wrapKey('raw', aesKey, recipientPub, { name: 'RSA-OAEP', hash: 'SHA-256' }),
    crypto.subtle.wrapKey('raw', aesKey, senderPub, { name: 'RSA-OAEP', hash: 'SHA-256' }),
  ]);

  return JSON.stringify({
    v: 1,
    iv: ab2b64(iv),
    ct: ab2b64(cipherBuffer),
    keys: {
      [recipientId]: ab2b64(recipientWrapped),
      [senderId]: ab2b64(senderWrapped),
    },
  });
}

/** Decrypt a stored ciphertext payload. Returns the plaintext or null. */
export async function decryptMessage(payloadString, userId) {
  if (!payloadString || typeof payloadString !== 'string') return null;
  if (!payloadString.trim().startsWith('{')) return payloadString; // legacy plaintext
  try {
    const payload = JSON.parse(payloadString);
    if (payload.v !== 1 || !payload.ct || !payload.iv || !payload.keys?.[userId]) return null;

    const stored = await getStoredPair();
    if (!stored?.privateKey) return null;

    const aesKey = await crypto.subtle.unwrapKey(
      'raw',
      b642ab(payload.keys[userId]),
      stored.privateKey,
      { name: 'RSA-OAEP', hash: 'SHA-256' },
      { name: 'AES-GCM', length: 256 },
      true,
      ['decrypt']
    );

    const plainBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: b642ab(payload.iv) },
      aesKey,
      b642ab(payload.ct)
    );

    return new TextDecoder().decode(plainBuffer);
  } catch {
    return null;
  }
}
