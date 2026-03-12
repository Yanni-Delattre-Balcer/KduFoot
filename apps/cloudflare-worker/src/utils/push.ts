/**
 * Web Push Notification utility for Cloudflare Workers.
 * Implements the VAPID + Web Push protocol using the Web Crypto API.
 * No external npm dependencies required.
 */

import { Env } from "../types/env";

interface PushSubscription {
    endpoint: string;
    keys: {
        p256dh: string;
        auth: string;
    };
}

/**
 * Send a push notification to a single subscriber.
 * Uses VAPID authentication via a self-signed JWT (ES256).
 */
export async function sendPushNotification(
    subscription: PushSubscription,
    payload: { title: string; body: string; icon?: string; url?: string },
    env: Env
): Promise<boolean> {
    try {
        const endpoint = new URL(subscription.endpoint);
        const audience = `${endpoint.protocol}//${endpoint.host}`;

        // Generate VAPID Authorization header
        const vapidHeaders = await generateVapidHeaders(
            audience,
            'mailto:support@kdufoot.com',
            env.VAPID_PUBLIC_KEY,
            env.VAPID_PRIVATE_KEY
        );

        // PAYLOAD ENCRYPTION (AES-128-GCM)
        // Modern browsers REQUIRE the payload to be encrypted.
        const encodedPayload = new TextEncoder().encode(JSON.stringify(payload));
        
        // 1. Generate salt (16 bytes)
        const salt = crypto.getRandomValues(new Uint8Array(16));
        
        // 2. Generate Local Key Pair for ECDH
        const localKeyPair = (await crypto.subtle.generateKey(
            { name: 'ECDH', namedCurve: 'P-256' },
            true,
            ['deriveBits']
        )) as CryptoKeyPair;
        const localPublicKey = new Uint8Array(await crypto.subtle.exportKey('raw', localKeyPair.publicKey) as ArrayBuffer);

        // 3. Import Remote Public Key (p256dh)
        const remotePublicKey = await crypto.subtle.importKey(
            'raw',
            base64urlDecode(subscription.keys.p256dh),
            { name: 'ECDH', namedCurve: 'P-256' },
            true,
            []
        );

        // 4. Derive Shared Secret
        const sharedSecret = await crypto.subtle.deriveBits(
            { name: 'ECDH', public: remotePublicKey } as any,
            localKeyPair.privateKey,
            256
        );

        // 5. HKDF - Extract & Expand to get CEK and Nonce
        const authSecret = base64urlDecode(subscription.keys.auth);
        
        // Info strings for HKDF
        const info = new TextEncoder().encode("Content-Encoding: aes128gcm\0");
        
        // PRK = HMAC-SHA-256(authSecret, sharedSecret)
        const prkKey = await crypto.subtle.importKey('raw', authSecret, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
        const prk = await crypto.subtle.sign('HMAC', prkKey, sharedSecret);
        
        // HKDF Expand (CEK and Nonce)
        const hkdfKey = await crypto.subtle.importKey('raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
        
        // CEK (16 bytes)
        const cekInfo = concatUint8(info, new Uint8Array([1]));
        const cek = (await crypto.subtle.sign('HMAC', hkdfKey, cekInfo)).slice(0, 16);
        
        // Nonce (12 bytes)
        const nonceInfo = concatUint8(info, new Uint8Array([2]));
        const nonce = (await crypto.subtle.sign('HMAC', hkdfKey, nonceInfo)).slice(0, 12);

        // 6. Encrypt
        const aesKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
        // Add record padding
        const padding = new Uint8Array([0, 0]); 
        const dataToEncrypt = concatUint8(encodedPayload, padding);
        
        const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: nonce },
            aesKey,
            dataToEncrypt
        ));

        // 7. Construct Final Body
        const body = new Uint8Array(21 + localPublicKey.length + ciphertext.length);
        body.set(salt, 0);
        new DataView(body.buffer).setUint32(16, 4096);
        body.set([localPublicKey.length], 20);
        body.set(localPublicKey, 21);
        body.set(ciphertext, 21 + localPublicKey.length);

        const response = await fetch(subscription.endpoint, {
            method: 'POST',
            headers: {
                'Authorization': vapidHeaders.authorization,
                'Content-Type': 'application/octet-stream',
                'Content-Encoding': 'aes128gcm',
                'TTL': '86400',
                'Urgency': 'normal',
                // Legacy headers for older mobile browsers or specific proxy requirements
                'Crypto-Key': `p256dh=${subscription.keys.p256dh}`,
                'Encryption': `salt=${arrayBufferToBase64url(salt)}`,
            },
            body,
        });

        if (response.status === 201 || response.status === 200) {
            return true;
        }

        // 410 Gone or 404 means the subscription is expired/invalid
        if (response.status === 410 || response.status === 404) {
            console.warn(`Push subscription expired for endpoint: ${subscription.endpoint}`);
            return false;
        }

        console.error(`Push failed with status ${response.status}: ${await response.text()}`);
        return false;
    } catch (error) {
        console.error('sendPushNotification error:', error);
        return false;
    }
}

function concatUint8(a: Uint8Array, b: Uint8Array): Uint8Array {
    const res = new Uint8Array(a.length + b.length);
    res.set(a, 0);
    res.set(b, a.length);
    return res;
}

/**
 * Generate VAPID Authorization headers (vapid scheme).
 * Creates a JWT signed with ES256 (ECDSA P-256 + SHA-256).
 */
async function generateVapidHeaders(
    audience: string,
    subject: string,
    publicKeyBase64url: string,
    privateKeyBase64url: string
): Promise<{ authorization: string }> {
    // Build JWT header & payload
    const header = { typ: 'JWT', alg: 'ES256' };
    const now = Math.floor(Date.now() / 1000);
    const jwtPayload = {
        aud: audience,
        exp: now + 12 * 3600, // 12 hours
        sub: subject,
    };

    const headerB64 = base64urlEncode(JSON.stringify(header));
    const payloadB64 = base64urlEncode(JSON.stringify(jwtPayload));
    const unsignedToken = `${headerB64}.${payloadB64}`;

    // Import the private key for signing
    const cryptoKey = await crypto.subtle.importKey(
        'jwk',
        {
            kty: 'EC',
            crv: 'P-256',
            d: privateKeyBase64url,
            x: await getPublicKeyX(publicKeyBase64url),
            y: await getPublicKeyY(publicKeyBase64url),
        },
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['sign']
    );

    // Sign the JWT
    const signature = await crypto.subtle.sign(
        { name: 'ECDSA', hash: 'SHA-256' },
        cryptoKey,
        new TextEncoder().encode(unsignedToken)
    );

    // Convert DER signature to raw r||s format expected by JWT
    const signatureB64 = arrayBufferToBase64url(derToRaw(new Uint8Array(signature)));
    const jwt = `${unsignedToken}.${signatureB64}`;

    return {
        authorization: `vapid t=${jwt}, k=${publicKeyBase64url}`,
    };
}

// ── Helpers ──

function base64urlEncode(str: string): string {
    const bytes = new TextEncoder().encode(str);
    return arrayBufferToBase64url(bytes);
}

function arrayBufferToBase64url(buffer: Uint8Array | ArrayBuffer): string {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    let binary = '';
    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(str: string): Uint8Array {
    const padded = str + '='.repeat((4 - (str.length % 4)) % 4);
    const binary = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

/**
 * Extract the X coordinate from a VAPID public key (uncompressed point 0x04 || X || Y).
 */
async function getPublicKeyX(publicKeyBase64url: string): Promise<string> {
    const bytes = base64urlDecode(publicKeyBase64url);
    // Uncompressed key: 0x04 + 32 bytes X + 32 bytes Y
    const x = bytes.slice(1, 33);
    return arrayBufferToBase64url(x);
}

async function getPublicKeyY(publicKeyBase64url: string): Promise<string> {
    const bytes = base64urlDecode(publicKeyBase64url);
    const y = bytes.slice(33, 65);
    return arrayBufferToBase64url(y);
}

/**
 * Convert a DER-encoded ECDSA signature to the raw r||s format.
 * Web Crypto API may return DER or raw depending on the runtime.
 */
function derToRaw(der: Uint8Array<ArrayBuffer>): Uint8Array<ArrayBuffer> {
    // If the signature is already 64 bytes, it's already raw
    if (der.length === 64) return der;

    // DER format: 0x30 <len> 0x02 <r-len> <r> 0x02 <s-len> <s>
    if (der[0] !== 0x30) return der; // Not DER, assume raw

    let offset = 2; // Skip 0x30 and total length

    // Read r
    if (der[offset] !== 0x02) return der;
    offset++;
    const rLen = der[offset];
    offset++;
    const rSlice = der.slice(offset, offset + rLen);
    offset += rLen;

    // Read s
    if (der[offset] !== 0x02) return der;
    offset++;
    const sLen = der[offset];
    offset++;
    const sSlice = der.slice(offset, offset + sLen);

    // Pad or trim to 32 bytes each
    const r = padTo32(rSlice);
    const s = padTo32(sSlice);

    const raw = new Uint8Array(64);
    raw.set(r as Uint8Array<ArrayBuffer>, 0);
    raw.set(s as Uint8Array<ArrayBuffer>, 32);
    return raw;
}

function padTo32(buf: Uint8Array): Uint8Array {
    if (buf.length === 32) return buf;
    if (buf.length > 32) return buf.slice(buf.length - 32);
    const padded = new Uint8Array(32);
    padded.set(buf, 32 - buf.length);
    return padded;
}
