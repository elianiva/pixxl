import { customAlphabet } from "nanoid";

const random = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz");

/**
 * Generates a URL-safe, alphanumeric ID.
 * Uses nanoid(8) and strips any non-alphanumeric characters.
 */
export function generateId(): string {
  return random(8);
}
