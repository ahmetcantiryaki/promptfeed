/**
 * Centralised password policy. Used by register actions and admin user
 * creation. Keep the list lean — Supabase auth has its own rate limiter,
 * so the goal here is to block the obvious cases (length, breached/known
 * weak passwords, missing variety).
 */

export const MIN_PASSWORD_LENGTH = 10;
export const MAX_PASSWORD_LENGTH = 128;

const COMMON_PASSWORDS = new Set([
  "password",
  "password1",
  "password123",
  "12345678",
  "123456789",
  "1234567890",
  "qwerty123",
  "qwertyuiop",
  "letmein123",
  "iloveyou1",
  "admin1234",
  "welcome123",
  "passw0rd",
  "abcd1234",
  "1q2w3e4r5t",
]);

export interface PasswordCheck {
  ok: boolean;
  message: string;
}

export function validatePassword(password: string): PasswordCheck {
  if (typeof password !== "string") {
    return { ok: false, message: "Password is required." };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    };
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return {
      ok: false,
      message: `Password must be at most ${MAX_PASSWORD_LENGTH} characters.`,
    };
  }
  const hasLetter = /[A-Za-z]/.test(password);
  const hasDigit = /\d/.test(password);
  if (!hasLetter || !hasDigit) {
    return {
      ok: false,
      message: "Password must include both letters and numbers.",
    };
  }
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return {
      ok: false,
      message: "This password is too common. Choose something stronger.",
    };
  }
  return { ok: true, message: "" };
}
