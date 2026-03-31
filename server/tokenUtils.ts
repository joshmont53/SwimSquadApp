// Token generation utilities for invitations and email verification
import crypto from 'crypto';

/**
 * Generate a cryptographically secure random token
 * @param bytes - Number of random bytes to generate (default: 48)
 * @returns URL-safe base64 encoded token
 */
export function generateSecureToken(bytes: number = 48): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

/**
 * Calculate expiration timestamp for invitations (48 hours from now)
 * @returns Date object representing expiration time
 */
export function getInvitationExpiry(): Date {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 48); // 48 hours
  return expiry;
}

/**
 * Calculate expiration timestamp for email verification (24 hours from now)
 * @returns Date object representing expiration time
 */
export function getVerificationExpiry(): Date {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 24); // 24 hours
  return expiry;
}

/**
 * Calculate expiration timestamp for password reset (1 hour from now)
 * @returns Date object representing expiration time
 */
export function getPasswordResetExpiry(): Date {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 1); // 1 hour
  return expiry;
}

/**
 * Check if a token has expired
 * @param expiresAt - Expiration timestamp
 * @returns True if expired, false otherwise
 */
export function isTokenExpired(expiresAt: Date): boolean {
  return new Date() > new Date(expiresAt);
}
