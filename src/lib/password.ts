import "server-only";

import { hash, verify } from "@node-rs/argon2";

// Параметры OWASP для argon2id: 19 МиБ памяти, 2 итерации.
const OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1 };

export function hashPassword(password: string) {
  return hash(password, OPTIONS);
}

export async function verifyPassword(passwordHash: string, password: string) {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}
