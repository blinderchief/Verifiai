import * as jose from 'jose';

/**
 * JWT Builder for Photon Integration
 * Creates JWTs for user onboarding via custom JWT flow
 */

export interface JWTClaims {
  /** Issuer */
  iss?: string;
  /** Subject (user identifier) */
  sub: string;
  /** Audience */
  aud?: string;
  /** User email */
  email?: string;
  /** User name */
  name?: string;
  /** Custom claims */
  [key: string]: unknown;
}

export interface JWTBuilderOptions {
  /** Secret key for signing (for testing/demo) */
  secret: string;
  /** Token expiration time (default: 1 year) */
  expiresIn?: string | number;
  /** Algorithm (default: HS256) */
  algorithm?: 'HS256' | 'HS384' | 'HS512';
}

/**
 * Build a JWT token for Photon registration
 * 
 * @example
 * ```typescript
 * const token = await buildJWT(
 *   { sub: 'user123', email: 'user@example.com', name: 'Test User' },
 *   { secret: 'your-secret-key' }
 * );
 * ```
 */
export async function buildJWT(
  claims: JWTClaims,
  options: JWTBuilderOptions
): Promise<string> {
  const { secret, expiresIn = '1y', algorithm = 'HS256' } = options;

  const secretKey = new TextEncoder().encode(secret);

  const jwt = await new jose.SignJWT({
    ...claims,
    Email: claims.email, // Photon expects 'Email' claim
  })
    .setProtectedHeader({ alg: algorithm, typ: 'JWT' })
    .setIssuedAt()
    .setIssuer(claims.iss || 'VerifiAI Protocol')
    .setAudience(claims.aud || 'www.verifiai.dev')
    .setSubject(claims.sub)
    .setExpirationTime(expiresIn)
    .sign(secretKey);

  return jwt;
}

/**
 * Decode a JWT without verification (for debugging)
 */
export function decodeJWT(token: string): jose.JWTPayload | null {
  try {
    return jose.decodeJwt(token);
  } catch {
    return null;
  }
}

/**
 * Verify a JWT with the secret
 */
export async function verifyJWT(
  token: string,
  secret: string
): Promise<jose.JWTPayload | null> {
  try {
    const secretKey = new TextEncoder().encode(secret);
    const { payload } = await jose.jwtVerify(token, secretKey);
    return payload;
  } catch {
    return null;
  }
}

/**
 * Generate a random user ID for testing
 */
export function generateUserId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a demo JWT for testing Photon integration
 */
export async function createDemoJWT(
  userId: string,
  email?: string,
  name?: string
): Promise<string> {
  return buildJWT(
    {
      sub: email || `${userId}@verifiai.dev`,
      email: email || `${userId}@verifiai.dev`,
      name: name || `User ${userId}`,
      user_id: userId,
    },
    {
      secret: 'verifiai-demo-secret-key-for-testing',
      expiresIn: '1y',
    }
  );
}
