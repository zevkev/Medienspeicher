// Seals an application for the relay: JSON, compressed (deflate-raw),
// encrypted with a fresh AES-256-GCM key; that key is encrypted with the
// RSA-OAEP public key. Works in browsers and in Node (Web Crypto), so the
// test can use the very same code.
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (str) => Uint8Array.from(atob(str), (c) => c.charCodeAt(0));

async function deflate(bytes) {
  if (typeof CompressionStream === "undefined") return { data: bytes, z: 0 };
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  return { data: new Uint8Array(await new Response(stream).arrayBuffer()), z: 1 };
}

export async function sealApplication(payload, publicKeyB64) {
  const { data, z } = await deflate(new TextEncoder().encode(JSON.stringify(payload)));
  const aesKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const sealed = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aesKey, data);
  const rsaKey = await crypto.subtle.importKey("spki", unb64(publicKeyB64), { name: "RSA-OAEP", hash: "SHA-256" }, false, ["encrypt"]);
  const wrapped = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, rsaKey, await crypto.subtle.exportKey("raw", aesKey));
  return JSON.stringify({ v: 1, z, k: b64(wrapped), i: b64(iv), d: b64(sealed) });
}
