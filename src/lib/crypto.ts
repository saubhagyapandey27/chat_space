export async function deriveKey(passphrase: string, salt: string): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
        "raw",
        enc.encode(passphrase),
        { name: "PBKDF2" },
        false,
        ["deriveBits", "deriveKey"]
    );

    return window.crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: enc.encode(salt),
            iterations: 100000,
            hash: "SHA-256",
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );
}

export async function encryptMessage(text: string, key: CryptoKey): Promise<string> {
    const enc = new TextEncoder();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await window.crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: iv,
        },
        key,
        enc.encode(text)
    );

    const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');
    const encryptedHex = Array.from(new Uint8Array(encrypted)).map(b => b.toString(16).padStart(2, '0')).join('');

    return `${ivHex}:${encryptedHex}`;
}

export async function decryptMessage(encryptedData: string, key: CryptoKey): Promise<string> {
    const [ivHex, encryptedHex] = encryptedData.split(':');
    if (!ivHex || !encryptedHex) throw new Error("Invalid encrypted format");

    const iv = new Uint8Array(ivHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    const encrypted = new Uint8Array(encryptedHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));

    const decrypted = await window.crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: iv,
        },
        key,
        encrypted
    );

    const dec = new TextDecoder();
    return dec.decode(decrypted);
}

export async function hashPassphrase(passphrase: string): Promise<string> {
    const enc = new TextEncoder();
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', enc.encode(passphrase));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Encrypt the Room Master Key with the User's Passphrase
export async function encryptMasterKey(masterKey: CryptoKey, passphrase: string): Promise<string> {
    // 1. Derive a Key-Wrapping Key (KWK) from the passphrase
    const kwk = await deriveKey(passphrase, 'master-key-salt'); // Fixed salt for simplicity

    // 2. Export the Master Key to raw bytes
    const masterKeyData = await window.crypto.subtle.exportKey('raw', masterKey);

    // 3. Encrypt the Master Key bytes with the KWK
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        kwk,
        masterKeyData
    );

    const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');
    const encryptedHex = Array.from(new Uint8Array(encrypted)).map(b => b.toString(16).padStart(2, '0')).join('');
    return `${ivHex}:${encryptedHex}`;
}

// Decrypt the Room Master Key using the User's Passphrase
export async function decryptMasterKey(encryptedMasterKey: string, passphrase: string): Promise<CryptoKey> {
    // 1. Derive the Key-Wrapping Key (KWK)
    const kwk = await deriveKey(passphrase, 'master-key-salt');

    // 2. Decrypt the Master Key bytes
    const [ivHex, encryptedHex] = encryptedMasterKey.split(':');
    const iv = new Uint8Array(ivHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    const encrypted = new Uint8Array(encryptedHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));

    const masterKeyData = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        kwk,
        encrypted
    );

    // 3. Import the Master Key back to a CryptoKey
    return window.crypto.subtle.importKey(
        "raw",
        masterKeyData,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );
}

export async function generateMasterKey(): Promise<CryptoKey> {
    return window.crypto.subtle.generateKey(
        {
            name: "AES-GCM",
            length: 256,
        },
        true,
        ["encrypt", "decrypt"]
    );
}
