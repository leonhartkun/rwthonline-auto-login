const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const SUPPORTED_ALGORITHMS = new Map([
  ["SHA1", "SHA-1"],
  ["SHA-1", "SHA-1"],
  ["SHA256", "SHA-256"],
  ["SHA-256", "SHA-256"],
  ["SHA512", "SHA-512"],
  ["SHA-512", "SHA-512"],
]);

function decode_base32(secret) {
  const normalized_secret = secret.toUpperCase().replace(/[\s=]/g, "");
  if (!normalized_secret) {
    throw new Error("TOTP secret is required.");
  }

  let bits = 0;
  let value = 0;
  const bytes = [];

  for (const character of normalized_secret) {
    const index = BASE32_ALPHABET.indexOf(character);
    if (index === -1) {
      throw new Error("TOTP secret must use Base32 characters.");
    }
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return new Uint8Array(bytes);
}

function normalize_algorithm(algorithm) {
  const normalized_algorithm = SUPPORTED_ALGORITHMS.get(
    String(algorithm || "SHA-1").toUpperCase()
  );
  if (!normalized_algorithm) {
    throw new Error("Unsupported TOTP algorithm.");
  }
  return normalized_algorithm;
}

export function parse_otpauth_uri(uri) {
  let parsed_uri;
  try {
    parsed_uri = new URL(uri);
  } catch {
    throw new Error("The QR code does not contain a valid otpauth URI.");
  }

  if (parsed_uri.protocol !== "otpauth:" || parsed_uri.hostname !== "totp") {
    throw new Error("The QR code must contain a TOTP otpauth URI.");
  }

  const secret = parsed_uri.searchParams.get("secret")?.replace(/\s/g, "");
  if (!secret) {
    throw new Error("The TOTP URI does not contain a secret.");
  }
  decode_base32(secret);

  const digits = Number(parsed_uri.searchParams.get("digits") || 6);
  const period = Number(parsed_uri.searchParams.get("period") || 30);
  if (![6, 7, 8].includes(digits)) {
    throw new Error("TOTP digits must be 6, 7, or 8.");
  }
  if (!Number.isInteger(period) || period < 1 || period > 300) {
    throw new Error("TOTP period must be between 1 and 300 seconds.");
  }

  return {
    secret: secret.toUpperCase(),
    algorithm: normalize_algorithm(parsed_uri.searchParams.get("algorithm")),
    digits,
    period,
  };
}

export async function generate_totp(secret, timestamp_ms = Date.now(), options = {}) {
  const digits = options.digits ?? 6;
  const period = options.period ?? 30;
  const algorithm = normalize_algorithm(options.algorithm ?? "SHA-1");
  const counter = Math.floor(timestamp_ms / 1_000 / period);
  const counter_bytes = new Uint8Array(8);
  let remaining_counter = BigInt(counter);

  for (let index = 7; index >= 0; index -= 1) {
    counter_bytes[index] = Number(remaining_counter & 0xffn);
    remaining_counter >>= 8n;
  }

  const key = await crypto.subtle.importKey(
    "raw",
    decode_base32(secret),
    { name: "HMAC", hash: { name: algorithm } },
    false,
    ["sign"]
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, counter_bytes)
  );
  const offset = signature[signature.length - 1] & 0x0f;
  const binary_code =
    ((signature[offset] & 0x7f) << 24) |
    (signature[offset + 1] << 16) |
    (signature[offset + 2] << 8) |
    signature[offset + 3];

  return String(binary_code % 10 ** digits).padStart(digits, "0");
}
