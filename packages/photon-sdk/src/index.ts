/**
 * Photon SDK for VerifiAI Protocol
 * 
 * Integrates Aptos Photon for:
 * - User onboarding with embedded wallets
 * - Rewarded campaign events for AI actions
 * - Streak and milestone achievements
 * - Referral tracking
 * 
 * @example
 * ```typescript
 * import { createPhotonClient, createRewardsManager } from '@verifiai/photon-sdk';
 * 
 * const client = createPhotonClient({
 *   apiKey: 'your-api-key',
 *   campaignId: 'your-campaign-id',
 * });
 * 
 * // Register a user
 * const user = await client.registerDemo('user123');
 * 
 * // Trigger a rewarded event
 * const reward = await client.onProofVerified('proof-001');
 * console.log(`Earned ${reward.data.token_amount} ${reward.data.token_symbol}`);
 * ```
 * 
 * @packageDocumentation
 */

// Types
export * from './types';

// JWT utilities
export {
  buildJWT,
  decodeJWT,
  verifyJWT,
  generateUserId,
  createDemoJWT,
  type JWTClaims,
  type JWTBuilderOptions,
} from './jwt';

// Client
export {
  PhotonClient,
  createPhotonClient,
} from './client';

// Rewards Manager
export {
  RewardsManager,
  createRewardsManager,
} from './rewards';

// Re-export commonly used types for convenience
export type {
  PhotonConfig,
  PhotonClientOptions,
  PhotonUser,
  PhotonWallet,
  PhotonTokens,
  PhotonUserData,
  PhotonEventType,
  PhotonCampaignEventRequest,
  PhotonCampaignEventResponse,
  PhotonRegistrationResponse,
} from './types';
