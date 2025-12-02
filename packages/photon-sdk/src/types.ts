/**
 * Photon SDK Types
 * Aptos unified identity, embedded wallet, and rewards infrastructure
 */

// ============================================================================
// Configuration Types
// ============================================================================

export interface PhotonConfig {
  /** Photon API Key */
  apiKey: string;
  /** Base URL for Photon API */
  baseUrl?: string;
  /** Campaign ID for rewarded events */
  campaignId?: string;
  /** Enable debug logging */
  debug?: boolean;
}

export interface PhotonClientOptions extends PhotonConfig {
  /** Custom fetch implementation */
  fetch?: typeof fetch;
  /** Request timeout in milliseconds */
  timeout?: number;
}

// ============================================================================
// Identity Types
// ============================================================================

export interface PhotonUser {
  id: string;
  name: string;
  avatar: string;
}

export interface PhotonUserIdentity {
  id?: string;
  user_id: string;
  provider: 'custom_jwt' | 'uuid' | 'google' | 'apple' | 'twitter';
  provider_id: string;
  client_id?: string;
}

export interface PhotonWallet {
  photonUserId?: string;
  walletAddress: string;
}

export interface PhotonTokens {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  refresh_token: string;
  scope: string;
  expires_at?: string;
}

export interface PhotonUserData {
  user: {
    user: PhotonUser;
    user_identities: PhotonUserIdentity[];
  };
  tokens: PhotonTokens;
  wallet: PhotonWallet;
}

// ============================================================================
// Registration Types
// ============================================================================

export type PhotonProvider = 'jwt' | 'google' | 'apple' | 'twitter';

export interface JWTRegistrationData {
  token: string;
  client_user_id?: string;
}

export interface PhotonRegistrationRequest {
  provider: PhotonProvider;
  data: JWTRegistrationData;
}

export interface PhotonRegistrationResponse {
  success: boolean;
  data: PhotonUserData;
}

// ============================================================================
// Campaign & Event Types
// ============================================================================

export type PhotonEventType = 
  | 'proof_verified'
  | 'proof_generated'
  | 'agent_created'
  | 'swarm_task_completed'
  | 'settlement_initiated'
  | 'settlement_completed'
  | 'model_uploaded'
  | 'daily_login'
  | 'referral'
  | 'streak_achieved'
  | string; // Allow custom event types

export interface PhotonCampaignEventRequest {
  /** Unique event ID */
  event_id: string;
  /** Type of event */
  event_type: PhotonEventType;
  /** Photon user ID or client user ID */
  user_id?: string;
  client_user_id?: string;
  /** Campaign ID for rewards */
  campaign_id: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Event timestamp (ISO 8601) */
  timestamp: string;
}

export interface PhotonCampaignEventResponse {
  success: boolean;
  data: {
    success: boolean;
    event_id: string;
    token_amount: number;
    token_symbol: string;
    campaign_id: string;
  };
}

// ============================================================================
// Analytics Types
// ============================================================================

export interface PhotonEventStats {
  total_events: number;
  total_rewards: number;
  events_by_type: Record<string, number>;
  rewards_by_type: Record<string, number>;
}

export interface PhotonUserStats {
  user_id: string;
  total_events: number;
  total_rewards: number;
  event_history: PhotonCampaignEventResponse[];
  current_streak: number;
  longest_streak: number;
}

// ============================================================================
// Error Types
// ============================================================================

export interface PhotonError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export class PhotonAPIError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(message: string, code: string, statusCode: number, details?: Record<string, unknown>) {
    super(message);
    this.name = 'PhotonAPIError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

// ============================================================================
// Utility Types
// ============================================================================

export interface PhotonResponse<T> {
  success: boolean;
  data?: T;
  error?: PhotonError;
}

export interface PhotonPaginatedResponse<T> {
  success: boolean;
  data: T[];
  cursor?: string;
  has_more: boolean;
}
