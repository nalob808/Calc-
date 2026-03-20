import jwt from 'jsonwebtoken';

/**
 * Simple admin authentication using JWT.
 * Credentials are checked against ADMIN_USERNAME and ADMIN_PASSWORD env vars.
 * JWT_SECRET defaults to ADMIN_PASSWORD if not set separately.
 */

export interface TokenPayload {
  username: string;
  iat: number;
  exp: number;
}

/**
 * Returns the JWT secret, falling back to ADMIN_PASSWORD.
 */
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET || process.env.ADMIN_PASSWORD;

  if (!secret) {
    throw new Error('Missing JWT_SECRET or ADMIN_PASSWORD env var');
  }

  return secret;
}

/**
 * Verifies admin credentials against env vars.
 * Returns true if username and password match.
 */
export function verifyCredentials(
  username: string,
  password: string
): boolean {
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminUsername || !adminPassword) {
    throw new Error('Missing ADMIN_USERNAME or ADMIN_PASSWORD env var');
  }

  return username === adminUsername && password === adminPassword;
}

/**
 * Creates a signed JWT token for the given username.
 * Token expires in 24 hours by default.
 */
export function createToken(username: string): string {
  const secret = getJwtSecret();

  return jwt.sign({ username }, secret, {
    expiresIn: '24h',
  });
}

/**
 * Verifies a JWT token and returns the decoded payload.
 * Throws an error if the token is invalid or expired.
 */
export function verifyToken(token: string): TokenPayload {
  const secret = getJwtSecret();

  try {
    const decoded = jwt.verify(token, secret) as TokenPayload;
    return decoded;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid token: ${message}`);
  }
}
