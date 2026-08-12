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

/** Ensure this device has keys and they match the server's stored public key. */
export async function ensureKeys(user) {
  if (!user) return null;
  const stored = await getStoredPair();

  if (stored?.publicKey) {
    const localB64 = ab2b64(await crypto.subtle.exportKey('spki', stored.publicKey));
    if (user.public_key && user.public_key === localB64) return { pair: stored, publicB64: localB64 };
    // Keys don't match server; update server with local key.
    await uploadPublicKey(localB64);
    return { pair: stored, publicB64: localB64 };
  }

  if (user.public_key) {
    // Server has a key but this device does not have the private half.
    // For true per-device security we issue a new device key and overwrite the public key.
    // Messages sent before this login were encrypted for the old public key and cannot be decrypted here.
    const { pair, publicB64 } = await generateIdentityKeys();
    await uploadPublicKey(publicB64);
    return { pair, publicB64 };
  }

  const { pair, publicB64 } = await generateIdentityKeys();
  await uploadPublicKey(publicB64);
  return { pair, publicB64 };
}

async function uploadPublicKey(b64) {
  const token = localStorage.getItem('br-session');
  if (!token) return;
  const r = await fetch('/api/auth/public-key', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ public_key: b64 }),
  });
  if (!r.ok) throw new Error('failed to upload public key');
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
