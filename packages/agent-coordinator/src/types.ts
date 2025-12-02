/**
 * @fileoverview Agent Coordinator Types
 * @description Type definitions for multi-agent coordination
 */

import { z } from 'zod';
import { AgentCapability, SwarmRole, ProofType } from '@verifiai/core';

/**
 * Agent configuration schema
 */
export const AgentConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  capabilities: z.array(z.nativeEnum({
    INFERENCE: 0,
    RWA_SETTLEMENT: 1,
    CONTENT_VERIFICATION: 2,
    ROYALTY_PROCESSING: 3,
    DATA_ANALYSIS: 4,
    SWARM_COORDINATION: 5,
  } as const)),
  modelPath: z.string().optional(),
  proofType: z.enum(['groth16', 'bulletproofs', 'hybrid']).default('groth16'),
  maxConcurrentTasks: z.number().default(5),
  metadata: z.record(z.unknown()).optional(),
});

export type AgentConfig = z.infer<typeof AgentConfigSchema>;

/**
 * Agent state in workflow
 */
export interface AgentState {
  /** Agent ID */
  agentId: string;
  /** Agent config */
  config: AgentConfig;
  /** Current status */
  status: 'idle' | 'processing' | 'waiting' | 'error';
  /** Current task ID */
  currentTaskId?: string;
  /** Messages buffer */
  messages: AgentMessage[];
  /** Shared context */
  context: Record<string, unknown>;
  /** Error if any */
  error?: string;
  /** Proof history */
  proofHistory: string[];
  /** Reputation score */
  reputation: number;
}

/**
 * Agent message format
 */
export interface AgentMessage {
  /** Message ID */
  id: string;
  /** Sender agent ID */
  from: string;
  /** Recipient agent ID (or 'broadcast') */
  to: string;
  /** Message type */
  type: MessageType;
  /** Message content */
  content: unknown;
  /** Timestamp */
  timestamp: number;
  /** Optional proof reference */
  proofId?: string;
}

/**
 * Message types
 */
export type MessageType = 
  | 'task_request'
  | 'task_response'
  | 'task_complete'
  | 'task_failed'
  | 'inference_request'
  | 'inference_result'
  | 'proof_generated'
  | 'proof_verified'
  | 'memory_update'
  | 'consensus_request'
  | 'consensus_vote'
  | 'heartbeat';

/**
 * Task definition
 */
export interface Task {
  /** Task ID */
  id: string;
  /** Task type */
  type: TaskType;
  /** Task priority */
  priority: 'low' | 'medium' | 'high' | 'critical';
  /** Required capabilities */
  requiredCapabilities: AgentCapability[];
  /** Input data */
  input: unknown;
  /** Expected output schema */
  outputSchema?: z.ZodSchema;
  /** Deadline timestamp */
  deadline?: number;
  /** Creator agent ID */
  createdBy: string;
  /** Assigned agent ID */
  assignedTo?: string;
  /** Task status */
  status: TaskStatus;
  /** Result if completed */
  result?: unknown;
  /** Proof ID if generated */
  proofId?: string;
  /** Created timestamp */
  createdAt: number;
  /** Completed timestamp */
  completedAt?: number;
}

/**
 * Task types
 */
export type TaskType =
  | 'inference'
  | 'verification'
  | 'settlement'
  | 'content_analysis'
  | 'royalty_calculation'
  | 'data_aggregation'
  | 'consensus'
  | 'custom';

/**
 * Task status
 */
export type TaskStatus =
  | 'pending'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'cancelled';

/**
 * Swarm configuration
 */
export interface SwarmConfig {
  /** Swarm ID */
  id: string;
  /** Swarm name */
  name: string;
  /** Maximum agents */
  maxAgents: number;
  /** Minimum agents for quorum */
  quorumSize: number;
  /** Consensus threshold (0-1) */
  consensusThreshold: number;
  /** Shelby blob ID for shared memory */
  memoryBlobId?: string;
  /** Proof type for swarm decisions */
  proofType: ProofType;
  /** Task distribution strategy */
  taskDistribution: 'round_robin' | 'capability_match' | 'load_balanced' | 'auction';
}

/**
 * Swarm state
 */
export interface SwarmState {
  /** Swarm config */
  config: SwarmConfig;
  /** Active agents */
  agents: Map<string, AgentState>;
  /** Pending tasks */
  pendingTasks: Task[];
  /** Active tasks */
  activeTasks: Map<string, Task>;
  /** Completed tasks */
  completedTasks: Task[];
  /** Shared memory */
  sharedMemory: Record<string, unknown>;
  /** Message queue */
  messageQueue: AgentMessage[];
  /** Last update timestamp */
  lastUpdate: number;
}

/**
 * Consensus request
 */
export interface ConsensusRequest {
  /** Request ID */
  id: string;
  /** Topic to vote on */
  topic: string;
  /** Options to vote for */
  options: string[];
  /** Required votes */
  requiredVotes: number;
  /** Deadline */
  deadline: number;
  /** Votes received */
  votes: Map<string, string>;
  /** Final result */
  result?: string;
}

/**
 * Workflow step definition
 */
export interface WorkflowStep {
  /** Step ID */
  id: string;
  /** Step name */
  name: string;
  /** Node function name */
  nodeName: string;
  /** Next step conditions */
  next: {
    condition: 'always' | 'success' | 'failure' | 'custom';
    customCondition?: (state: SwarmState) => boolean;
    target: string;
  }[];
}

/**
 * Workflow definition
 */
export interface Workflow {
  /** Workflow ID */
  id: string;
  /** Workflow name */
  name: string;
  /** Entry step */
  entryStep: string;
  /** Steps */
  steps: Map<string, WorkflowStep>;
  /** End conditions */
  endConditions: ((state: SwarmState) => boolean)[];
}

/**
 * LangGraph node input/output
 */
export interface NodeIO {
  state: SwarmState;
  messages?: AgentMessage[];
  task?: Task;
}

/**
 * Inference request for agents
 */
export interface InferenceRequest {
  /** Request ID */
  requestId: string;
  /** Model to use */
  modelPath: string;
  /** Input data */
  input: Float32Array | Float64Array;
  /** Input shape */
  inputShape: number[];
  /** Proof type */
  proofType: ProofType;
  /** Additional context */
  context?: Record<string, unknown>;
}

/**
 * Inference result from agents
 */
export interface InferenceResult {
  /** Request ID */
  requestId: string;
  /** Output data */
  output: number[];
  /** Proof ID on Shelby */
  proofId: string;
  /** On-chain proof hash */
  proofHash: string;
  /** Inference time in ms */
  inferenceTimeMs: number;
  /** Proof generation time in ms */
  proofGenerationTimeMs: number;
  /** Agent that processed */
  agentId: string;
}
