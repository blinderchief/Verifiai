/**
 * @fileoverview Agent Node
 * @description Individual agent implementation with proof generation
 */

import { v4 as uuidv4 } from 'uuid';
import { ProofGenerator, ProofRequest } from '@verifiai/proof-engine';
import { ProofStorageClient, StoredProof } from '@verifiai/shelby-client';
import { sha3HashHex, AgentCapability, ProofType } from '@verifiai/core';
import {
  AgentConfig,
  AgentState,
  AgentMessage,
  Task,
  TaskStatus,
  InferenceRequest,
  InferenceResult,
  MessageType,
} from './types';

/**
 * Agent node in the coordination network
 */
export class AgentNode {
  private config: AgentConfig;
  private state: AgentState;
  private proofGenerator: ProofGenerator;
  private proofStorage: ProofStorageClient;
  private messageHandlers: Map<MessageType, (msg: AgentMessage) => Promise<void>>;

  constructor(
    config: AgentConfig,
    proofGenerator: ProofGenerator,
    proofStorage: ProofStorageClient
  ) {
    this.config = config;
    this.proofGenerator = proofGenerator;
    this.proofStorage = proofStorage;

    this.state = {
      agentId: config.id,
      config: config,
      status: 'idle',
      messages: [],
      context: {},
      proofHistory: [],
      reputation: 100,
    };

    this.messageHandlers = new Map();
    this.setupMessageHandlers();
  }

  /**
   * Get agent ID
   */
  getId(): string {
    return this.config.id;
  }

  /**
   * Get agent state
   */
  getState(): AgentState {
    return { ...this.state };
  }

  /**
   * Get agent status (alias for getState for compatibility)
   */
  getStatus(): { agentId: string; status: string } {
    return {
      agentId: this.state.agentId,
      status: this.state.status,
    };
  }

  /**
   * Execute a task
   */
  async execute(request: { input: string; context?: Record<string, unknown>; saveToMemory?: boolean }): Promise<{ output: string; memoryUpdated?: boolean }> {
    // Simple execution for testing
    const output = `Processed: ${request.input}`;
    let memoryUpdated = false;

    if (request.saveToMemory) {
      this.updateContext({ [request.input]: output });
      memoryUpdated = true;
    }

    return { output, memoryUpdated };
  }

  /**
   * Pause the agent
   */
  pause(): void {
    this.state.status = 'waiting'; // Using 'waiting' as paused
  }

  /**
   * Resume the agent
   */
  resume(): void {
    this.state.status = 'idle';
  }

  /**
   * Get agent capabilities
   */
  getCapabilities(): AgentCapability[] {
    return [...this.config.capabilities] as unknown as AgentCapability[];
  }

  /**
   * Check if agent has capability
   */
  hasCapability(capability: AgentCapability): boolean {
    return this.config.capabilities.includes(capability as unknown as any);
  }

  /**
   * Process an inference request
   */
  async processInference(request: InferenceRequest): Promise<InferenceResult> {
    this.state.status = 'processing';
    this.state.currentTaskId = request.requestId;

    try {
      // Generate proof with inference
      const proofRequest: ProofRequest = {
        modelId: request.modelPath, // Use modelPath as modelId
        inputs: Array.from(request.input),
        outputs: [], // Will be filled by inference
        modelHash: '', // Could compute from modelPath if needed
        timestamp: Date.now(),
        proofType: request.proofType as ProofType,
        modelPath: request.modelPath,
        inputData: request.input,
        inputShape: request.inputShape,
        cacheKey: `${request.modelPath}:${sha3HashHex(new Uint8Array(request.input.buffer))}`,
      };

      const proofResult = await this.proofGenerator.generateProof(proofRequest);

      // Store proof on Shelby
      const storedProof: StoredProof = {
        proofId: '',
        proofType: request.proofType as 'groth16' | 'bulletproofs' | 'hybrid',
        proofData: JSON.stringify(proofResult.proof.proof),
        publicSignals: (proofResult.proof.publicSignals ?? []).map((s) => s.toString()),
        modelHash: proofResult.inferenceResult?.modelHash ?? '',
        inferenceMetadata: {
          inferenceTimeMs: proofResult.inferenceResult?.inferenceTimeMs ?? 0,
          modelId: request.modelPath,
          inputHash: sha3HashHex(new Uint8Array(request.input.buffer)),
          outputHash: sha3HashHex(
            new Uint8Array(
              Float32Array.from(proofResult.inferenceResult?.outputs[0]?.data ?? []).buffer
            )
          ),
        },
        timestamp: Date.now(),
        agentAddress: this.config.id,
      };

      const { proofId } = await this.proofStorage.storeProof(storedProof);

      // Update state
      this.state.proofHistory.push(proofId);
      this.state.status = 'idle';
      this.state.currentTaskId = undefined;

      return {
        requestId: request.requestId,
        output: Array.from(proofResult.inferenceResult?.outputs[0]?.data ?? []),
        proofId,
        proofHash: proofResult.proof.proofHash ?? '',
        inferenceTimeMs: proofResult.inferenceResult?.inferenceTimeMs ?? 0,
        proofGenerationTimeMs: proofResult.proof.generationTimeMs,
        agentId: this.config.id,
      };
    } catch (error) {
      this.state.status = 'error';
      this.state.error = (error as Error).message;
      throw error;
    }
  }

  /**
   * Execute a task
   */
  async executeTask(task: Task): Promise<Task> {
    this.state.status = 'processing';
    this.state.currentTaskId = task.id;

    const updatedTask: Task = {
      ...task,
      status: 'in_progress',
      assignedTo: this.config.id,
    };

    try {
      switch (task.type) {
        case 'inference':
          updatedTask.result = await this.processInference(task.input as InferenceRequest);
          break;
        case 'verification':
          updatedTask.result = await this.verifyProof(task.input as { proofId: string });
          break;
        case 'settlement':
          updatedTask.result = await this.processSettlement(task.input);
          break;
        case 'content_analysis':
          updatedTask.result = await this.analyzeContent(task.input);
          break;
        case 'royalty_calculation':
          updatedTask.result = await this.calculateRoyalties(task.input);
          break;
        case 'data_aggregation':
          updatedTask.result = await this.aggregateData(task.input);
          break;
        case 'consensus':
          updatedTask.result = await this.participateInConsensus(task.input);
          break;
        default:
          throw new Error(`Unknown task type: ${task.type}`);
      }

      updatedTask.status = 'completed';
      updatedTask.completedAt = Date.now();
      
      // Increase reputation for successful task
      this.state.reputation = Math.min(100, this.state.reputation + 1);
    } catch (error) {
      updatedTask.status = 'failed';
      updatedTask.result = { error: (error as Error).message };
      
      // Decrease reputation for failed task
      this.state.reputation = Math.max(0, this.state.reputation - 5);
    }

    this.state.status = 'idle';
    this.state.currentTaskId = undefined;

    return updatedTask;
  }

  /**
   * Handle incoming message
   */
  async handleMessage(message: AgentMessage): Promise<AgentMessage | null> {
    this.state.messages.push(message);

    const handler = this.messageHandlers.get(message.type);
    if (handler) {
      await handler(message);
    }

    // Generate response if applicable
    return this.generateResponse(message);
  }

  /**
   * Send message to another agent
   */
  createMessage(
    to: string,
    type: MessageType,
    content: unknown,
    proofId?: string
  ): AgentMessage {
    return {
      id: uuidv4(),
      from: this.config.id,
      to,
      type,
      content,
      timestamp: Date.now(),
      proofId,
    };
  }

  /**
   * Update agent context
   */
  updateContext(updates: Record<string, unknown>): void {
    this.state.context = {
      ...this.state.context,
      ...updates,
    };
  }

  /**
   * Get context value
   */
  getContextValue<T>(key: string): T | undefined {
    return this.state.context[key] as T | undefined;
  }

  /**
   * Check if agent is available for tasks
   */
  isAvailable(): boolean {
    return this.state.status === 'idle';
  }

  /**
   * Get active task count
   */
  getActiveTaskCount(): number {
    return this.state.currentTaskId ? 1 : 0;
  }

  /**
   * Setup message handlers
   */
  private setupMessageHandlers(): void {
    this.messageHandlers.set('task_request', async (msg) => {
      this.state.context['pendingTask'] = msg.content;
    });

    this.messageHandlers.set('inference_request', async (msg) => {
      const request = msg.content as InferenceRequest;
      const result = await this.processInference(request);
      this.state.context['lastInferenceResult'] = result;
    });

    this.messageHandlers.set('memory_update', async (msg) => {
      const update = msg.content as { key: string; value: unknown };
      this.state.context[update.key] = update.value;
    });

    this.messageHandlers.set('heartbeat', async (_msg) => {
      // Update last seen timestamp
      this.state.context['lastHeartbeat'] = Date.now();
    });
  }

  /**
   * Generate response to message
   */
  private async generateResponse(message: AgentMessage): Promise<AgentMessage | null> {
    switch (message.type) {
      case 'task_request':
        return this.createMessage(
          message.from,
          'task_response',
          { accepted: this.isAvailable(), agentId: this.config.id }
        );

      case 'heartbeat':
        return this.createMessage(
          message.from,
          'heartbeat',
          { status: this.state.status, timestamp: Date.now() }
        );

      case 'consensus_request':
        const vote = await this.participateInConsensus(message.content);
        return this.createMessage(
          message.from,
          'consensus_vote',
          vote
        );

      default:
        return null;
    }
  }

  /**
   * Verify a proof
   */
  private async verifyProof(input: { proofId: string }): Promise<{ valid: boolean }> {
    const integrity = await this.proofStorage.verifyProofIntegrity(input.proofId);
    return { valid: integrity.valid };
  }

  /**
   * Process settlement (placeholder)
   */
  private async processSettlement(input: unknown): Promise<unknown> {
    // Settlement processing logic
    return { processed: true, input };
  }

  /**
   * Analyze content (placeholder)
   */
  private async analyzeContent(input: unknown): Promise<unknown> {
    // Content analysis logic
    return { analyzed: true, input };
  }

  /**
   * Calculate royalties (placeholder)
   */
  private async calculateRoyalties(input: unknown): Promise<unknown> {
    // Royalty calculation logic
    return { calculated: true, input };
  }

  /**
   * Aggregate data (placeholder)
   */
  private async aggregateData(input: unknown): Promise<unknown> {
    // Data aggregation logic
    return { aggregated: true, input };
  }

  /**
   * Participate in consensus
   */
  private async participateInConsensus(input: unknown): Promise<unknown> {
    const request = input as { topic: string; options: string[] };
    // Simple voting logic - in production, use more sophisticated consensus
    const vote = request.options[0];
    return { agentId: this.config.id, vote };
  }
}
