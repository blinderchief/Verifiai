import {
  PhotonClientOptions,
  PhotonRegistrationRequest,
  PhotonRegistrationResponse,
  PhotonCampaignEventRequest,
  PhotonCampaignEventResponse,
  PhotonAPIError,
  PhotonUserData,
  PhotonEventType,
} from './types';
import { buildJWT, createDemoJWT, generateUserId } from './jwt';

/**
 * Default Photon API base URL (staging)
 */
const DEFAULT_BASE_URL = 'https://stage-api.getstan.app/identity-service/api/v1';

/**
 * Photon Client
 * 
 * Provides integration with Aptos Photon for:
 * - User onboarding with embedded wallets
 * - Rewarded and unrewarded campaign events
 * - PAT token rewards
 * 
 * @example
 * ```typescript
 * const client = new PhotonClient({
 *   apiKey: 'your-api-key',
 *   campaignId: 'your-campaign-id',
 * });
 * 
 * // Register a user
 * const user = await client.registerWithJWT(jwtToken);
 * 
 * // Trigger a rewarded event
 * await client.triggerEvent('proof_verified', user.data.user.user.id);
 * ```
 */
export class PhotonClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly campaignId: string;
  private readonly debug: boolean;
  private readonly fetchFn: typeof fetch;
  private readonly timeout: number;

  private currentUser: PhotonUserData | null = null;
  private accessToken: string | null = null;

  constructor(options: PhotonClientOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl || DEFAULT_BASE_URL;
    this.campaignId = options.campaignId || '';
    this.debug = options.debug || false;
    this.fetchFn = options.fetch || fetch;
    this.timeout = options.timeout || 30000;
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  private log(...args: unknown[]): void {
    if (this.debug) {
      console.log('[PhotonClient]', ...args);
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey,
      ...(options.headers as Record<string, string>),
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    this.log(`Request: ${options.method || 'GET'} ${url}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await this.fetchFn(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json() as { message?: string; code?: string; details?: Record<string, unknown> };

      if (!response.ok) {
        throw new PhotonAPIError(
          data.message || 'Request failed',
          data.code || 'UNKNOWN_ERROR',
          response.status,
          data.details
        );
      }

      this.log('Response:', data);
      return data as T;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof PhotonAPIError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new PhotonAPIError('Request timeout', 'TIMEOUT', 408);
      }

      throw new PhotonAPIError(
        error instanceof Error ? error.message : 'Unknown error',
        'NETWORK_ERROR',
        0
      );
    }
  }

  // ===========================================================================
  // User Registration & Authentication
  // ===========================================================================

  /**
   * Register a user using a JWT token
   * Creates an embedded wallet automatically
   */
  async registerWithJWT(
    token: string,
    clientUserId?: string
  ): Promise<PhotonRegistrationResponse> {
    const request: PhotonRegistrationRequest = {
      provider: 'jwt',
      data: {
        token,
        client_user_id: clientUserId,
      },
    };

    const response = await this.request<PhotonRegistrationResponse>(
      '/identity/register',
      {
        method: 'POST',
        body: JSON.stringify(request),
      }
    );

    if (response.success && response.data) {
      this.currentUser = response.data;
      this.accessToken = response.data.tokens.access_token;
    }

    return response;
  }

  /**
   * Quick registration for demo/testing
   * Generates a JWT and registers the user
   */
  async registerDemo(
    userId?: string,
    email?: string,
    name?: string
  ): Promise<PhotonRegistrationResponse> {
    const id = userId || generateUserId();
    const token = await createDemoJWT(id, email, name);
    return this.registerWithJWT(token, id);
  }

  /**
   * Register with custom claims
   */
  async registerWithClaims(
    claims: {
      userId: string;
      email?: string;
      name?: string;
      [key: string]: unknown;
    },
    secret: string
  ): Promise<PhotonRegistrationResponse> {
    const token = await buildJWT(
      {
        sub: claims.email || claims.userId,
        email: claims.email,
        name: claims.name,
        user_id: claims.userId,
        ...claims,
      },
      { secret }
    );

    return this.registerWithJWT(token, claims.userId);
  }

  /**
   * Get the current authenticated user
   */
  getCurrentUser(): PhotonUserData | null {
    return this.currentUser;
  }

  /**
   * Get the current user's wallet address
   */
  getWalletAddress(): string | null {
    return this.currentUser?.wallet.walletAddress || null;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.accessToken !== null && this.currentUser !== null;
  }

  /**
   * Clear current session
   */
  logout(): void {
    this.currentUser = null;
    this.accessToken = null;
  }

  // ===========================================================================
  // Campaign Events
  // ===========================================================================

  /**
   * Trigger a campaign event (rewarded or unrewarded based on campaign config)
   */
  async triggerEvent(
    eventType: PhotonEventType,
    userId?: string,
    metadata?: Record<string, unknown>
  ): Promise<PhotonCampaignEventResponse> {
    const effectiveUserId = userId || this.currentUser?.user.user.id;

    if (!effectiveUserId) {
      throw new PhotonAPIError(
        'User ID required. Either pass userId or register first.',
        'USER_REQUIRED',
        400
      );
    }

    if (!this.campaignId) {
      throw new PhotonAPIError(
        'Campaign ID required. Set campaignId in client options.',
        'CAMPAIGN_REQUIRED',
        400
      );
    }

    const eventId = `${eventType}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const request: PhotonCampaignEventRequest = {
      event_id: eventId,
      event_type: eventType,
      user_id: effectiveUserId,
      campaign_id: this.campaignId,
      metadata: metadata || {},
      timestamp: new Date().toISOString(),
    };

    return this.request<PhotonCampaignEventResponse>(
      '/attribution/events/campaign',
      {
        method: 'POST',
        body: JSON.stringify(request),
      }
    );
  }

  /**
   * Trigger a proof verification event (rewarded)
   */
  async onProofVerified(
    proofId: string,
    userId?: string,
    metadata?: Record<string, unknown>
  ): Promise<PhotonCampaignEventResponse> {
    return this.triggerEvent('proof_verified', userId, {
      proof_id: proofId,
      ...metadata,
    });
  }

  /**
   * Trigger a proof generation event (rewarded)
   */
  async onProofGenerated(
    proofId: string,
    algorithm: string,
    userId?: string,
    metadata?: Record<string, unknown>
  ): Promise<PhotonCampaignEventResponse> {
    return this.triggerEvent('proof_generated', userId, {
      proof_id: proofId,
      algorithm,
      ...metadata,
    });
  }

  /**
   * Trigger an agent creation event
   */
  async onAgentCreated(
    agentId: string,
    userId?: string,
    metadata?: Record<string, unknown>
  ): Promise<PhotonCampaignEventResponse> {
    return this.triggerEvent('agent_created', userId, {
      agent_id: agentId,
      ...metadata,
    });
  }

  /**
   * Trigger a swarm task completion event
   */
  async onSwarmTaskCompleted(
    swarmId: string,
    taskId: string,
    userId?: string,
    metadata?: Record<string, unknown>
  ): Promise<PhotonCampaignEventResponse> {
    return this.triggerEvent('swarm_task_completed', userId, {
      swarm_id: swarmId,
      task_id: taskId,
      ...metadata,
    });
  }

  /**
   * Trigger a settlement completion event
   */
  async onSettlementCompleted(
    settlementId: string,
    amount: string,
    userId?: string,
    metadata?: Record<string, unknown>
  ): Promise<PhotonCampaignEventResponse> {
    return this.triggerEvent('settlement_completed', userId, {
      settlement_id: settlementId,
      amount,
      ...metadata,
    });
  }

  /**
   * Trigger a model upload event
   */
  async onModelUploaded(
    modelId: string,
    modelName: string,
    userId?: string,
    metadata?: Record<string, unknown>
  ): Promise<PhotonCampaignEventResponse> {
    return this.triggerEvent('model_uploaded', userId, {
      model_id: modelId,
      model_name: modelName,
      ...metadata,
    });
  }

  /**
   * Trigger a daily login event (unrewarded tracking)
   */
  async onDailyLogin(
    userId?: string,
    metadata?: Record<string, unknown>
  ): Promise<PhotonCampaignEventResponse> {
    return this.triggerEvent('daily_login', userId, metadata);
  }

  /**
   * Trigger a referral event
   */
  async onReferral(
    referrerId: string,
    referredUserId: string,
    metadata?: Record<string, unknown>
  ): Promise<PhotonCampaignEventResponse> {
    return this.triggerEvent('referral', referrerId, {
      referred_user_id: referredUserId,
      ...metadata,
    });
  }

  /**
   * Trigger a streak achievement event
   */
  async onStreakAchieved(
    streakDays: number,
    userId?: string,
    metadata?: Record<string, unknown>
  ): Promise<PhotonCampaignEventResponse> {
    return this.triggerEvent('streak_achieved', userId, {
      streak_days: streakDays,
      ...metadata,
    });
  }

  // ===========================================================================
  // Utility Methods
  // ===========================================================================

  /**
   * Set the campaign ID
   */
  setCampaignId(campaignId: string): void {
    (this as unknown as { campaignId: string }).campaignId = campaignId;
  }

  /**
   * Set the access token manually
   */
  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  /**
   * Get client configuration (for debugging)
   */
  getConfig(): { baseUrl: string; campaignId: string; hasApiKey: boolean } {
    return {
      baseUrl: this.baseUrl,
      campaignId: this.campaignId,
      hasApiKey: !!this.apiKey,
    };
  }
}

/**
 * Create a PhotonClient instance
 */
export function createPhotonClient(options: PhotonClientOptions): PhotonClient {
  return new PhotonClient(options);
}
