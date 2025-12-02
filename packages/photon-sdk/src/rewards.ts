import { PhotonClient } from './client';
import {
  PhotonEventType,
  PhotonCampaignEventResponse,
  PhotonUserStats,
  PhotonClientOptions,
} from './types';

/**
 * Rewards Manager
 * 
 * Provides high-level reward management including:
 * - Batch event processing
 * - Streak tracking
 * - Achievement milestones
 * - Reward aggregation
 */
export class RewardsManager {
  private readonly client: PhotonClient;
  private eventQueue: Array<{
    type: PhotonEventType;
    userId?: string;
    metadata?: Record<string, unknown>;
  }> = [];
  private isProcessing = false;

  constructor(client: PhotonClient) {
    this.client = client;
  }

  // ===========================================================================
  // Queue Management
  // ===========================================================================

  /**
   * Queue an event for batch processing
   */
  queueEvent(
    type: PhotonEventType,
    userId?: string,
    metadata?: Record<string, unknown>
  ): void {
    this.eventQueue.push({ type, userId, metadata });
  }

  /**
   * Process all queued events
   */
  async processQueue(): Promise<PhotonCampaignEventResponse[]> {
    if (this.isProcessing || this.eventQueue.length === 0) {
      return [];
    }

    this.isProcessing = true;
    const results: PhotonCampaignEventResponse[] = [];

    try {
      while (this.eventQueue.length > 0) {
        const event = this.eventQueue.shift()!;
        try {
          const result = await this.client.triggerEvent(
            event.type,
            event.userId,
            event.metadata
          );
          results.push(result);
        } catch (error) {
          console.error(`Failed to process event ${event.type}:`, error);
        }
      }
    } finally {
      this.isProcessing = false;
    }

    return results;
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return this.eventQueue.length;
  }

  /**
   * Clear the event queue
   */
  clearQueue(): void {
    this.eventQueue = [];
  }

  // ===========================================================================
  // Milestone Achievements
  // ===========================================================================

  /**
   * Check and trigger milestone achievements for proof verifications
   */
  async checkProofMilestones(
    proofCount: number,
    userId?: string
  ): Promise<PhotonCampaignEventResponse | null> {
    const milestones = [10, 50, 100, 500, 1000];
    
    if (milestones.includes(proofCount)) {
      return this.client.triggerEvent('proof_milestone', userId, {
        milestone: proofCount,
        achievement: `${proofCount}_proofs_verified`,
      });
    }

    return null;
  }

  /**
   * Check and trigger milestone achievements for agent operations
   */
  async checkAgentMilestones(
    agentCount: number,
    userId?: string
  ): Promise<PhotonCampaignEventResponse | null> {
    const milestones = [1, 5, 10, 25, 50];
    
    if (milestones.includes(agentCount)) {
      return this.client.triggerEvent('agent_milestone', userId, {
        milestone: agentCount,
        achievement: `${agentCount}_agents_created`,
      });
    }

    return null;
  }

  /**
   * Check and trigger swarm completion milestones
   */
  async checkSwarmMilestones(
    taskCount: number,
    userId?: string
  ): Promise<PhotonCampaignEventResponse | null> {
    const milestones = [10, 100, 500, 1000, 5000];
    
    if (milestones.includes(taskCount)) {
      return this.client.triggerEvent('swarm_milestone', userId, {
        milestone: taskCount,
        achievement: `${taskCount}_swarm_tasks_completed`,
      });
    }

    return null;
  }

  // ===========================================================================
  // Streak Tracking
  // ===========================================================================

  private streakData: Map<string, { lastLogin: Date; currentStreak: number }> = new Map();

  /**
   * Track daily login and calculate streak
   */
  async trackDailyStreak(userId: string): Promise<{
    currentStreak: number;
    isNewStreak: boolean;
    reward?: PhotonCampaignEventResponse;
  }> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const userData = this.streakData.get(userId);
    let currentStreak = 1;
    let isNewStreak = false;

    if (userData) {
      const lastLogin = new Date(userData.lastLogin);
      const lastLoginDate = new Date(
        lastLogin.getFullYear(),
        lastLogin.getMonth(),
        lastLogin.getDate()
      );

      const daysDiff = Math.floor(
        (today.getTime() - lastLoginDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff === 0) {
        // Same day, no streak update
        return { currentStreak: userData.currentStreak, isNewStreak: false };
      } else if (daysDiff === 1) {
        // Consecutive day
        currentStreak = userData.currentStreak + 1;
        isNewStreak = true;
      } else {
        // Streak broken
        currentStreak = 1;
        isNewStreak = true;
      }
    } else {
      isNewStreak = true;
    }

    // Update streak data
    this.streakData.set(userId, { lastLogin: now, currentStreak });

    // Track the login event
    await this.client.onDailyLogin(userId, { streak: currentStreak });

    // Check for streak milestones
    let reward: PhotonCampaignEventResponse | undefined;
    const streakMilestones = [7, 14, 30, 60, 90, 180, 365];
    
    if (streakMilestones.includes(currentStreak)) {
      reward = await this.client.onStreakAchieved(currentStreak, userId);
    }

    return { currentStreak, isNewStreak, reward };
  }

  /**
   * Get current streak for a user
   */
  getCurrentStreak(userId: string): number {
    return this.streakData.get(userId)?.currentStreak || 0;
  }

  // ===========================================================================
  // Referral System
  // ===========================================================================

  private referralCounts: Map<string, number> = new Map();

  /**
   * Process a referral and check for referral milestones
   */
  async processReferral(
    referrerId: string,
    referredUserId: string
  ): Promise<{
    reward: PhotonCampaignEventResponse;
    milestone?: PhotonCampaignEventResponse;
    totalReferrals: number;
  }> {
    const count = (this.referralCounts.get(referrerId) || 0) + 1;
    this.referralCounts.set(referrerId, count);

    const reward = await this.client.onReferral(referrerId, referredUserId);

    // Check for referral milestones
    const milestones = [5, 10, 25, 50, 100];
    let milestone: PhotonCampaignEventResponse | undefined;

    if (milestones.includes(count)) {
      milestone = await this.client.triggerEvent('referral_milestone', referrerId, {
        milestone: count,
        achievement: `${count}_referrals`,
      });
    }

    return { reward, milestone, totalReferrals: count };
  }

  /**
   * Get referral count for a user
   */
  getReferralCount(userId: string): number {
    return this.referralCounts.get(userId) || 0;
  }

  // ===========================================================================
  // Statistics
  // ===========================================================================

  /**
   * Calculate total rewards from event responses
   */
  calculateTotalRewards(events: PhotonCampaignEventResponse[]): number {
    return events.reduce((total, event) => {
      return total + (event.data?.token_amount || 0);
    }, 0);
  }
}

/**
 * Create a RewardsManager instance
 */
export function createRewardsManager(
  clientOrOptions: PhotonClient | PhotonClientOptions
): RewardsManager {
  const client = clientOrOptions instanceof PhotonClient
    ? clientOrOptions
    : new PhotonClient(clientOrOptions);
  
  return new RewardsManager(client);
}
