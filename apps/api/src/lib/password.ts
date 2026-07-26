import argon2 from "argon2";

/**
 * argon2id at the OWASP recommended floor: 19 MiB of memory, two passes.
 * Memory cost is what makes GPU cracking expensive, so it is the last thing
 * to lower if hashing ever needs to get cheaper.
 */
const HASH_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

export function hashPassword(plainText: string): Promise<string> {
  return argon2.hash(plainText, HASH_OPTIONS);
}

export async function verifyPassword(hash: string, plainText: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plainText);
  } catch {
    // A malformed hash must read as a failed login, not as a server error.
    return false;
  }
}
