import { createHash, randomBytes } from "crypto";

export function randomUrlSafeValue(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

export function createPkcePair() {
  const verifier = randomUrlSafeValue(48);
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}
