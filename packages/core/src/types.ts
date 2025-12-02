/**
 * @fileoverview Core type definitions for VerifiAI Protocol
 * @description Defines all shared types used across the protocol
 */

import { z } from 'zod';

// ============ Proof Types ============

/**
 * Supported proof types in VerifiAI Protocol
 */
export enum ProofType {
  /** Groth16 zkSNARK proof - fast verification */
  GROTH16 = 'groth16',
  /** Bulletproofs - range proofs for outputs */
  BULLETPROOFS = 'bulletproofs',
  /** Hybrid TEE-attested proof */
  HYBRID = 'hybrid',
}

/**
 * Proof status enumeration
 */
export enum ProofStatus {
  PENDING = 'pending',
  SUBMITTED = 'submitted',
  VERIFYING = 'verifying',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

/**
 * Groth16 verification key components
 */
export interface Groth16VerificationKey {
  /** Alpha point (G1) */
  alpha: Uint8Array;
  /** Beta point (G2) */
  beta: Uint8Array;
  /** Gamma point (G2) */
  gamma: Uint8Array;
  /** Delta point (G2) */
  delta: Uint8Array;
  /** IC points for public inputs */
  ic: Uint8Array[];
}

/**
 * Bulletproofs verification parameters
 */
export interface BulletproofsParams {
  /** Generator points */
  generators: Uint8Array;
  /** Pedersen commitment bases */
  pedersenBases: Uint8Array;
  /** Range proof bit size */
  rangeBits: number;
}

/**
 * Complete proof data structure
 */
export interface Proof {
  /** Unique proof identifier */
  id: string;
  /** Type of proof */
  type: ProofType;
  /** Serialized proof data */
  proofData: Uint8Array;
  /** Public inputs/outputs */
  publicInputs: Uint8Array[];
  /** Hash of the AI model used */
  modelHash: string;
  /** Inference output hash */
  outputHash: string;
  /** Submitter address */
  submitter: string;
  /** Submission timestamp */
  submittedAt: Date;
  /** Current status */
  status: ProofStatus;
  /** Verification timestamp */
  verifiedAt?: Date;
  /** Gas used for verification */
  gasUsed?: bigint;
}

/**
 * Proof submission request
 */
export const ProofSubmissionSchema = z.object({
  proofType: z.nativeEnum(ProofType),
  proofData: z.instanceof(Uint8Array),
  publicInputs: z.array(z.instanceof(Uint8Array)),
  modelHash: z.string().min(1),
  outputHash: z.string().min(1),
});

export type ProofSubmission = z.infer<typeof ProofSubmissionSchema>;

// ============ Agent Types ============

/**
 * Agent capability types
 */
export enum AgentCapability {
  INFERENCE = 'inference',
  RWA_SETTLEMENT = 'rwa_settlement',
  CONTENT_VERIFICATION = 'content_verification',
  ROYALTY_PROCESSING = 'royalty_processing',
  DATA_ANALYSIS = 'data_analysis',
  SWARM_COORDINATION = 'swarm_coordination',
}

/**
 * Agent status
 */
export enum AgentStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

/**
 * Agent capability definition
 */
export interface Capability {
  /** Capability type */
  type: AgentCapability;
  /** Human-readable name */
  name: string;
  /** Whether enabled */
  enabled: boolean;
  /** Last used timestamp */
  lastUsed?: Date;
}

/**
 * Proof history entry for an agent
 */
export interface ProofHistoryEntry {
  /** Proof ID */
  proofId: string;
  /** Action performed */
  action: string;
  /** Timestamp */
  timestamp: Date;
  /** Whether verified */
  verified: boolean;
}

/**
 * Complete agent definition
 */
export interface Agent {
  /** Unique agent identifier */
  id: string;
  /** Owner address */
  owner: string;
  /** Agent name */
  name: string;
  /** Description */
  description: string;
  /** Shelby blob URI for metadata */
  metadataUri: string;
  /** Model hash */
  modelHash: string;
  /** Capabilities */
  capabilities: Capability[];
  /** Proof history */
  proofHistory: ProofHistoryEntry[];
  /** Total verified actions */
  verifiedActions: number;
  /** Registration timestamp */
  registeredAt: Date;
  /** Last activity */
  lastActive: Date;
  /** Status */
  status: AgentStatus;
  /** Reputation score (0-1000) */
  reputation: number;
}

/**
 * Agent registration request
 */
export const AgentRegistrationSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000),
  metadataUri: z.string().url().optional(),
  modelHash: z.string().min(1),
  capabilities: z.array(z.nativeEnum(AgentCapability)),
});

export type AgentRegistration = z.infer<typeof AgentRegistrationSchema>;

// ============ Swarm Types ============

/**
 * Swarm member role
 */
export enum SwarmRole {
  LEADER = 'leader',
  WORKER = 'worker',
  VALIDATOR = 'validator',
}

/**
 * Task status
 */
export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * Swarm member entry
 */
export interface SwarmMember {
  /** Agent ID */
  agentId: string;
  /** Role in swarm */
  role: SwarmRole;
  /** Join timestamp */
  joinedAt: Date;
  /** Contribution score */
  contribution: number;
}

/**
 * Shared memory state reference
 */
export interface SharedMemoryState {
  /** Shelby blob URI for current state */
  blobUri: string;
  /** State hash for verification */
  stateHash: string;
  /** Last update timestamp */
  updatedAt: Date;
  /** Agent that made last update */
  updatedBy: string;
  /** Version number */
  version: number;
}

/**
 * Task definition
 */
export interface Task {
  /** Unique task ID */
  id: string;
  /** Task description */
  description: string;
  /** Assigned agent ID */
  assignedTo?: string;
  /** Task status */
  status: TaskStatus;
  /** Required proof ID */
  proofId?: string;
  /** Result hash */
  resultHash?: string;
  /** Creation timestamp */
  createdAt: Date;
  /** Completion timestamp */
  completedAt?: Date;
}

/**
 * Agent swarm definition
 */
export interface Swarm {
  /** Unique swarm identifier */
  id: string;
  /** Creator address */
  creator: string;
  /** Swarm name */
  name: string;
  /** Description */
  description: string;
  /** Member list */
  members: SwarmMember[];
  /** Shared memory state */
  sharedMemory: SharedMemoryState;
  /** Active tasks */
  tasks: Task[];
  /** Total completed tasks */
  completedTasks: number;
  /** Creation timestamp */
  createdAt: Date;
  /** Whether active */
  isActive: boolean;
}

// ============ Settlement Types ============

/**
 * Asset types for RWA settlements
 */
export enum AssetType {
  INVOICE = 'invoice',
  TRADE_FINANCE = 'trade_finance',
  REAL_ESTATE = 'real_estate',
  COMMODITY = 'commodity',
  ROYALTY = 'royalty',
}

/**
 * Settlement states
 */
export enum SettlementState {
  PENDING = 'pending',
  PROOF_SUBMITTED = 'proof_submitted',
  VERIFIED = 'verified',
  EXECUTED = 'executed',
  DISPUTED = 'disputed',
  CANCELLED = 'cancelled',
}

/**
 * Party role in settlement
 */
export enum PartyRole {
  INITIATOR = 'initiator',
  COUNTERPARTY = 'counterparty',
  VALIDATOR = 'validator',
}

/**
 * Settlement party
 */
export interface SettlementParty {
  /** Party address */
  address: string;
  /** Role */
  role: PartyRole;
  /** Has approved */
  approved: boolean;
  /** Approval timestamp */
  approvedAt?: Date;
}

/**
 * AI decision for settlement
 */
export interface AIDecision {
  /** Proof ID */
  proofId: string;
  /** Confidence score (0-1000) */
  confidence: number;
  /** Risk score (0-1000) */
  riskScore: number;
  /** Decision summary hash */
  summaryHash: string;
  /** Shelby blob URI for full analysis */
  analysisUri: string;
}

/**
 * RWA Settlement record
 */
export interface Settlement {
  /** Unique settlement ID */
  id: string;
  /** Asset type */
  assetType: AssetType;
  /** Asset identifier */
  assetRef: string;
  /** Value in base units */
  value: bigint;
  /** Parties involved */
  parties: SettlementParty[];
  /** AI decision data */
  aiDecision: AIDecision;
  /** Current state */
  state: SettlementState;
  /** Initiator address */
  initiator: string;
  /** Creation timestamp */
  createdAt: Date;
  /** Expiration timestamp */
  expiresAt: Date;
  /** Execution timestamp */
  executedAt?: Date;
  /** Dispute reason */
  disputeReason?: string;
}

// ============ Configuration Types ============

/**
 * Network configuration
 */
export enum Network {
  MAINNET = 'mainnet',
  TESTNET = 'testnet',
  DEVNET = 'devnet',
  LOCAL = 'local',
}

/**
 * Protocol configuration
 */
export interface ProtocolConfig {
  /** Network to connect to */
  network: Network;
  /** Aptos node URL */
  nodeUrl: string;
  /** Aptos faucet URL (testnet only) */
  faucetUrl?: string;
  /** VerifiAI contract address */
  contractAddress: string;
  /** Shelby API key */
  shelbyApiKey?: string;
  /** Shelby network */
  shelbyNetwork?: 'shelbynet' | 'mainnet';
}

/**
 * Default configurations for different networks
 */
export const DEFAULT_CONFIGS: Record<Network, Partial<ProtocolConfig>> = {
  [Network.MAINNET]: {
    network: Network.MAINNET,
    nodeUrl: 'https://fullnode.mainnet.aptoslabs.com/v1',
    shelbyNetwork: 'mainnet',
  },
  [Network.TESTNET]: {
    network: Network.TESTNET,
    nodeUrl: 'https://fullnode.testnet.aptoslabs.com/v1',
    faucetUrl: 'https://faucet.testnet.aptoslabs.com',
    shelbyNetwork: 'shelbynet',
  },
  [Network.DEVNET]: {
    network: Network.DEVNET,
    nodeUrl: 'https://fullnode.devnet.aptoslabs.com/v1',
    faucetUrl: 'https://faucet.devnet.aptoslabs.com',
    shelbyNetwork: 'shelbynet',
  },
  [Network.LOCAL]: {
    network: Network.LOCAL,
    nodeUrl: 'http://localhost:8080/v1',
    faucetUrl: 'http://localhost:8081',
    shelbyNetwork: 'shelbynet',
  },
};

// ============ Event Types ============

/**
 * Event types emitted by the protocol
 */
export enum EventType {
  PROOF_SUBMITTED = 'ProofSubmitted',
  PROOF_VERIFIED = 'ProofVerified',
  PROOF_REJECTED = 'ProofRejected',
  AGENT_REGISTERED = 'AgentRegistered',
  AGENT_ACTION_EXECUTED = 'AgentActionExecuted',
  AGENT_DEACTIVATED = 'AgentDeactivated',
  SWARM_CREATED = 'SwarmCreated',
  AGENT_JOINED_SWARM = 'AgentJoinedSwarm',
  SHARED_MEMORY_UPDATED = 'SharedMemoryUpdated',
  SETTLEMENT_INITIATED = 'SettlementInitiated',
  SETTLEMENT_COMPLETED = 'SettlementCompleted',
}

/**
 * Base event interface
 */
export interface ProtocolEvent {
  /** Event type */
  type: EventType;
  /** Transaction hash */
  txHash: string;
  /** Block height */
  blockHeight: bigint;
  /** Event timestamp */
  timestamp: Date;
  /** Event data */
  data: Record<string, unknown>;
}

// ============ Photon Types ============

/**
 * Photon campaign event types
 */
export enum PhotonEventType {
  PROOF_GENERATED = 'proof_generated',
  PROOF_VERIFIED = 'proof_verified',
  SETTLEMENT_INITIATED = 'settlement_initiated',
  SETTLEMENT_COMPLETED = 'settlement_completed',
  AGENT_CREATED = 'agent_created',
  SWARM_CREATED = 'swarm_created',
  MODEL_UPLOADED = 'model_uploaded',
  DAILY_LOGIN = 'daily_login',
  SWARM_TASK_COMPLETED = 'swarm_task_completed',
}

/**
 * Photon user registration request
 */
export interface PhotonRegistrationRequest {
  idToken: string;
  userId?: string;
  email?: string;
  name?: string;
}

/**
 * Photon user session data
 */
export interface PhotonSession {
  user: {
    id: string;
    photonId: string;
    email?: string;
    name?: string;
  };
  wallet: {
    walletAddress: string;
    publicKey: string;
  };
  accessToken: string;
  expiresAt: Date;
}

/**
 * Photon campaign event request
 */
export interface PhotonCampaignEvent {
  eventType: PhotonEventType;
  userId: string;
  metadata?: Record<string, unknown>;
  timestamp?: Date;
}

/**
 * Photon reward entry
 */
export interface PhotonReward {
  eventId: string;
  eventType: PhotonEventType;
  tokenAmount: number;
  tokenSymbol: string;
  timestamp: Date;
}

/**
 * Photon user statistics
 */
export interface PhotonUserStats {
  totalPoints: number;
  currentStreak: number;
  longestStreak: number;
  eventsCompleted: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  rank?: number;
}

// ============ Response Types ============

/**
 * Standard API response
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    hasMore: boolean;
  };
}
