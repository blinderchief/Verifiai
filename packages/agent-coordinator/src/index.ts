/**
 * @fileoverview Agent Coordinator Package Exports
 * @description Main entry point for @verifiai/agent-coordinator
 */

// Types
export * from './types';

// Agent Node
export { AgentNode } from './agent-node';

// Swarm Coordinator
export { SwarmCoordinator } from './swarm-coordinator';

// Re-export commonly used types
export type {
  AgentConfig,
  AgentState,
  AgentMessage,
  Task,
  TaskType,
  TaskStatus,
  SwarmConfig,
  SwarmState,
  InferenceRequest,
  InferenceResult,
  ConsensusRequest,
  Workflow,
  WorkflowStep,
} from './types';
