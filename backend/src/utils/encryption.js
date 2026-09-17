const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getEncryptionKey() {
  const key = process.env.CREDENTIAL_ENCRYPTION_KEY;

  if (!key) {
    throw new Error("CREDENTIAL_ENCRYPTION_KEY is not configured");
  }

  if (!/^[0-9a-fA-F]{64}$/.test(key)) {
    throw new Error(
      "CREDENTIAL_ENCRYPTION_KEY must be a 64-character hexadecimal string"
    );
  }

  return Buffer.from(key, "hex");
}

function encryptJson(value) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const plaintext = JSON.stringify(value);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return {
    version: 1,
    algorithm: ALGORITHM,
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
    data: encrypted.toString("hex"),
  };
}

function decryptJson(envelope) {
  const key = getEncryptionKey();

  if (!envelope || envelope.version !== 1) {
    throw new Error("Unsupported encrypted credential format");
  }

  const decipher = crypto.createDecipheriv(
    envelope.algorithm,
    key,
    Buffer.from(envelope.iv, "hex")
  );

  decipher.setAuthTag(Buffer.from(envelope.authTag, "hex"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(envelope.data, "hex")),
    decipher.final(),
  ]);

  return JSON.parse(decrypted.toString("utf8"));
}

module.exports = {
  encryptJson,
  decryptJson,
};