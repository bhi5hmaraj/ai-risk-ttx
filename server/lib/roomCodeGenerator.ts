/**
 * Room Code Generator
 *
 * Generates unique 6-character alphanumeric room codes for multiplayer games.
 *
 * Format: ABC123 (3 uppercase letters + 3 numbers)
 * - Easy to read and communicate verbally
 * - Avoids ambiguous characters (0/O, 1/I/L)
 * - Large enough namespace (17,576 * 900 = 15.8 million codes)
 *
 * Used with Colyseus filterBy(['gameId']) pattern - clients with the same
 * gameId will always land in the same room instance.
 */

const LETTERS = 'ABCDEFGHJKMNPQRSTUVWXYZ'; // Excludes I, L, O (avoid confusion with 1, 0)
const NUMBERS = '23456789'; // Excludes 0, 1 (avoid confusion with O, I, L)

/**
 * Generate a random 6-character room code
 *
 * @returns Room code in format ABC123
 *
 * @example
 * generateRoomCode() // "XYZ456"
 * generateRoomCode() // "ABC234"
 */
export function generateRoomCode(): string {
  const letterPart = Array.from({ length: 3 }, () =>
    LETTERS[Math.floor(Math.random() * LETTERS.length)]
  ).join('');

  const numberPart = Array.from({ length: 3 }, () =>
    NUMBERS[Math.floor(Math.random() * NUMBERS.length)]
  ).join('');

  return letterPart + numberPart;
}

/**
 * Validate that a room code matches the expected format
 *
 * @param code - Room code to validate
 * @returns true if valid, false otherwise
 *
 * @example
 * isValidRoomCode('ABC123') // true
 * isValidRoomCode('abc123') // false (lowercase)
 * isValidRoomCode('AB123')  // false (wrong length)
 * isValidRoomCode('ABC12O') // false (contains O)
 */
export function isValidRoomCode(code: string): boolean {
  if (code.length !== 6) return false;

  const letterPart = code.slice(0, 3);
  const numberPart = code.slice(3, 6);

  // Check letter part (only allowed letters, no I/L/O)
  if (![...letterPart].every(c => LETTERS.includes(c))) {
    return false;
  }

  // Check number part (only allowed numbers, no 0/1)
  if (![...numberPart].every(c => NUMBERS.includes(c))) {
    return false;
  }

  return true;
}

/**
 * Normalize a room code (uppercase, trim)
 *
 * @param code - Room code to normalize
 * @returns Normalized room code
 *
 * @example
 * normalizeRoomCode('abc123') // 'ABC123'
 * normalizeRoomCode(' xyz456 ') // 'XYZ456'
 */
export function normalizeRoomCode(code: string): string {
  return code.trim().toUpperCase();
}
