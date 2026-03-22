/**
 * joinCode.js — utilities for working with classroom join codes.
 *
 * Note: actual join code GENERATION happens server-side (classrooms.js route).
 * These are client-side helpers for formatting and validation only.
 */

const VALID_CHARS = /^[A-Z0-9]{6}$/;

/**
 * Normalise raw user input into an uppercase trimmed join code.
 * @param {string} raw
 * @returns {string}
 */
export function normaliseJoinCode(raw) {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Return true if the string is a syntactically valid join code
 * (6 uppercase alphanumeric characters).
 * Does NOT verify the code exists in the database.
 * @param {string} code
 * @returns {boolean}
 */
export function isValidJoinCode(code) {
  return VALID_CHARS.test(code);
}

/**
 * Format a join code for display — adds a space in the middle for readability.
 * e.g. "AB3D9F" → "AB3 D9F"
 * @param {string} code
 * @returns {string}
 */
export function formatJoinCode(code) {
  if (!code || code.length !== 6) return code ?? '';
  return `${code.slice(0, 3)} ${code.slice(3)}`;
}

/**
 * Strip the display space from a formatted code before sending to the API.
 * e.g. "AB3 D9F" → "AB3D9F"
 * @param {string} formatted
 * @returns {string}
 */
export function stripJoinCodeSpace(formatted) {
  return formatted.replace(/\s/g, '').toUpperCase();
}