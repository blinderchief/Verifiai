/**
 * @fileoverview Swarm Coordinator
 * @description Orchestrates multi-agent swarms with LangGraph
 */

import { v4 as uuidv4 } from 'uuid';
import { StateGraph, END, START } from '@langchain/langgraph';
import { RunnableConfig } from '@langchain/core/runnables';
import { ProofGenerator, createDefaultProofGenerator } from '@verifiai/proof-engine';
import {
  ProofStorageClient,
  SwarmMemoryClient,
  ShelbyConfig,
} from '@verifiai/shelby-client';
import { AgentCapability, ProofType } from '@verifiai/core';
import {
  SwarmConfig,
  SwarmState,
  AgentConfig,
  Task,
  TaskType,
  TaskStatus,
  AgentMessage,
  ConsensusRequest,
  Workflow,
  WorkflowStep,
} from './types';
import { AgentNode } from './agent-node';

/**
 * Swarm coordinator using LangGraph
 */
export class SwarmCoordinator {
  private config: SwarmConfig;
  private agents: Map<string, AgentNode> = new Map();
  private proofGenerator: ProofGenerator;
  private proofStorage: ProofStorageClient;
  private swarmMemory: SwarmMemoryClient;
  private state: SwarmState;
  private graph: StateGraph<SwarmState, Partial<SwarmState>> | null = null;
  private activeConsensus: Map<string, ConsensusRequest> = new Map();

  constructor(
    config: SwarmConfig,
    shelbyConfig: ShelbyConfig,
    proofGenerator?: ProofGenerator
  ) {
    this.config = config;
    this.proofGenerator = proofGenerator ?? createDefaultProofGenerator();
    this.proofStorage = new ProofStorageClient(shelbyConfig);
    this.swarmMemory = new SwarmMemoryClient(shelbyConfig);

    this.state = {
      config,
      agents: new Map(),
      pendingTasks: [],
      activeTasks: new Map(),
      completedTasks: [],
      sharedMemory: {},
      messageQueue: [],
      lastUpdate: Date.now(),
    };
  }

  /**
   * Initialize the swarm
   */
  async initialize(): Promise<void> {
    await this.proofGenerator.initialize();
    
    // Initialize shared memory
    const memory = await this.swarmMemory.initializeMemory(this.config.id, {
      createdAt: Date.now(),
      taskCount: 0,
      consensusHistory: [],
    });
    
    this.state.sharedMemory = memory.data;
    this.config.memoryBlobId = this.config.id; // Use swarm ID as memory ID
  }

  /**
   * Register an agent with the swarm
   */
  async registerAgent(agentConfig: AgentConfig): Promise<AgentNode> {
    if (this.agents.size >= this.config.maxAgents) {
      throw new Error(`Swarm has reached maximum agents: ${this.config.maxAgents}`);
    }

    const agent = new AgentNode(
      agentConfig,
      this.proofGenerator,
      this.proofStorage
    );

    this.agents.set(agentConfig.id, agent);
    this.state.agents.set(agentConfig.id, agent.getState());

    // Update shared memory
    await this.swarmMemory.setValue(
      this.config.id,
      `agent:${agentConfig.id}`,
      { registered: Date.now(), capabilities: agentConfig.capabilities },
      'coordinator'
    );

    return agent;
  }

  /**
   * Remove an agent from the swarm
   */
  async removeAgent(agentId: string): Promise<boolean> {
    const removed = this.agents.delete(agentId);
    this.state.agents.delete(agentId);

    if (removed) {
      await this.swarmMemory.deleteValue(
        this.config.id,
        `agent:${agentId}`,
        'coordinator'
      );
    }

    return removed;
  }

  /**
   * Submit a task to the swarm
   */
  async submitTask(
    type: TaskType,
    input: unknown,
    priority: Task['priority'] = 'medium',
    requiredCapabilities: AgentCapability[] = []
  ): Promise<Task> {
    const task: Task = {
      id: uuidv4(),
      type,
      priority,
      requiredCapabilities,
      input,
      createdBy: 'coordinator',
      status: 'pending',
      createdAt: Date.now(),
    };

    this.state.pendingTasks.push(task);
    await this.distributeTasks();

    return task;
  }

  /**
   * Get task status
   */
  getTaskStatus(taskId: string): Task | undefined {
    // Check active tasks
    const active = this.state.activeTasks.get(taskId);
    if (active) return active;

    // Check pending tasks
    const pending = this.state.pendingTasks.find((t) => t.id === taskId);
    if (pending) return pending;

    // Check completed tasks
    return this.state.completedTasks.find((t) => t.id === taskId);
  }

  /**
   * Distribute pending tasks to available agents
   */
  async distributeTasks(): Promise<void> {
    const pendingTasks = [...this.state.pendingTasks];
    
    for (const task of pendingTasks) {
      const agent = this.selectAgentForTask(task);
      
      if (agent) {
        // Remove from pending
        const index = this.state.pendingTasks.findIndex((t) => t.id === task.id);
        if (index >= 0) {
          this.state.pendingTasks.splice(index, 1);
        }

        // Add to active
        task.assignedTo = agent.getId();
        task.status = 'assigned';
        this.state.activeTasks.set(task.id, task);

        // Execute task
        this.executeTaskOnAgent(agent, task);
      }
    }
  }

  /**
   * Select best agent for task
   */
  private selectAgentForTask(task: Task): AgentNode | null {
    const availableAgents = Array.from(this.agents.values()).filter((agent) => {
      // Check availability
      if (!agent.isAvailable()) return false;

      // Check capabilities
      for (const capability of task.requiredCapabilities) {
        if (!agent.hasCapability(capability)) return false;
      }

      return true;
    });

    if (availableAgents.length === 0) return null;

    // Use distribution strategy
    switch (this.config.taskDistribution) {
      case 'round_robin':
        return availableAgents[0] ?? null;

      case 'capability_match':
        // Prefer agents with most matching capabilities
        return (
          availableAgents.sort(
            (a, b) =>
              this.countMatchingCapabilities(b, task) -
              this.countMatchingCapabilities(a, task)
          )[0] ?? null
        );

      case 'load_balanced':
        // Prefer agents with lowest active task count
        return (
          availableAgents.sort(
            (a, b) => a.getActiveTaskCount() - b.getActiveTaskCount()
          )[0] ?? null
        );

      case 'auction':
        // Would implement reputation-based bidding
        return (
          availableAgents.sort(
            (a, b) => b.getState().reputation - a.getState().reputation
          )[0] ?? null
        );

      default:
        return availableAgents[0] ?? null;
    }
  }

  /**
   * Count matching capabilities
   */
  private countMatchingCapabilities(agent: AgentNode, task: Task): number {
    return task.requiredCapabilities.filter((cap) => agent.hasCapability(cap))
      .length;
  }

  /**
   * Execute task on agent
   */
  private async executeTaskOnAgent(agent: AgentNode, task: Task): Promise<void> {
    try {
      const result = await agent.executeTask(task);
      
      // Move to completed
      this.state.activeTasks.delete(task.id);
      this.state.completedTasks.push(result);

      // Update shared memory
      await this.swarmMemory.setValue(
        this.config.id,
        `task:${task.id}`,
        { status: result.status, completedAt: result.completedAt },
        'coordinator'
      );
    } catch (error) {
      // Mark as failed
      task.status = 'failed';
      this.state.activeTasks.delete(task.id);
      this.state.completedTasks.push(task);
    }
  }

  /**
   * Initiate consensus among agents
   */
  async initiateConsensus(
    topic: string,
    options: string[],
    deadlineMs: number = 30000
  ): Promise<ConsensusRequest> {
    const request: ConsensusRequest = {
      id: uuidv4(),
      topic,
      options,
      requiredVotes: Math.ceil(this.agents.size * this.config.consensusThreshold),
      deadline: Date.now() + deadlineMs,
      votes: new Map(),
    };

    this.activeConsensus.set(request.id, request);

    // Broadcast consensus request
    const message: AgentMessage = {
      id: uuidv4(),
      from: 'coordinator',
      to: 'broadcast',
      type: 'consensus_request',
      content: { id: request.id, topic, options },
      timestamp: Date.now(),
    };

    await this.broadcastMessage(message);

    return request;
  }

  /**
   * Record a consensus vote
   */
  async recordVote(
    consensusId: string,
    agentId: string,
    vote: string
  ): Promise<boolean> {
    const consensus = this.activeConsensus.get(consensusId);
    if (!consensus) return false;

    // Check if still within deadline
    if (Date.now() > consensus.deadline) return false;

    // Record vote
    consensus.votes.set(agentId, vote);

    // Check if consensus reached
    if (consensus.votes.size >= consensus.requiredVotes) {
      this.resolveConsensus(consensus);
    }

    return true;
  }

  /**
   * Resolve consensus
   */
  private resolveConsensus(consensus: ConsensusRequest): void {
    // Count votes
    const voteCounts = new Map<string, number>();
    for (const vote of consensus.votes.values()) {
      voteCounts.set(vote, (voteCounts.get(vote) ?? 0) + 1);
    }

    // Find winner
    let maxVotes = 0;
    let winner = '';
    for (const [option, count] of voteCounts) {
      if (count > maxVotes) {
        maxVotes = count;
        winner = option;
      }
    }

    consensus.result = winner;
  }

  /**
   * Broadcast message to all agents
   */
  async broadcastMessage(message: AgentMessage): Promise<void> {
    for (const agent of this.agents.values()) {
      const response = await agent.handleMessage(message);
      if (response) {
        this.state.messageQueue.push(response);
      }
    }
  }

  /**
   * Send message to specific agent
   */
  async sendMessage(agentId: string, message: AgentMessage): Promise<AgentMessage | null> {
    const agent = this.agents.get(agentId);
    if (!agent) return null;

    return agent.handleMessage(message);
  }

  /**
   * Create LangGraph workflow
   */
  createWorkflow(workflow: Workflow): void {
    // Define channel reducers for state management
    type ChannelReducers = {
      config: { value: (x: SwarmConfig, y: SwarmConfig | undefined) => SwarmConfig; default: () => SwarmConfig };
      agents: { value: (x: Map<string, import('./types').AgentState>, y: Map<string, import('./types').AgentState> | undefined) => Map<string, import('./types').AgentState>; default: () => Map<string, import('./types').AgentState> };
      pendingTasks: { value: (x: Task[], y: Task[] | undefined) => Task[]; default: () => Task[] };
      activeTasks: { value: (x: Map<string, Task>, y: Map<string, Task> | undefined) => Map<string, Task>; default: () => Map<string, Task> };
      completedTasks: { value: (x: Task[], y: Task[] | undefined) => Task[]; default: () => Task[] };
      sharedMemory: { value: (x: Record<string, unknown>, y: Record<string, unknown> | undefined) => Record<string, unknown>; default: () => Record<string, unknown> };
      messageQueue: { value: (x: AgentMessage[], y: AgentMessage[] | undefined) => AgentMessage[]; default: () => AgentMessage[] };
      lastUpdate: { value: (x: number, y: number | undefined) => number; default: () => number };
    };
    
    const channels: ChannelReducers = {
      config: { value: (x, y) => y ?? x, default: () => this.config },
      agents: { value: (x, y) => y ?? x, default: () => new Map() },
      pendingTasks: { value: (x, y) => y ?? x, default: () => [] },
      activeTasks: { value: (x, y) => y ?? x, default: () => new Map() },
      completedTasks: { value: (x, y) => y ?? x, default: () => [] },
      sharedMemory: { value: (x, y) => ({ ...x, ...(y ?? {}) }), default: () => ({}) },
      messageQueue: { value: (x, y) => [...x, ...(y ?? [])], default: () => [] },
      lastUpdate: { value: (x, y) => y ?? x, default: () => Date.now() },
    };
    
    // Use 'any' to work around LangGraph type constraints for node names
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const graph = new StateGraph<SwarmState, Partial<SwarmState>>({
      channels: channels as any,
    }) as any;
    
    this.graph = graph;

    // Add nodes
    graph.addNode('distributor', this.createDistributorNode());
    graph.addNode('executor', this.createExecutorNode());
    graph.addNode('aggregator', this.createAggregatorNode());
    graph.addNode('consensus', this.createConsensusNode());

    // Add edges based on workflow - cast to work with LangGraph's strict typing
    graph.addEdge(START, 'distributor');
    graph.addConditionalEdges('distributor', (state: SwarmState) => {
      if ((state.pendingTasks ?? []).length > 0) return 'executor';
      if ((state.activeTasks ?? new Map()).size > 0) return 'aggregator';
      return END;
    });
    graph.addEdge('executor', 'aggregator');
    graph.addConditionalEdges('aggregator', (state: SwarmState) => {
      if (this.activeConsensus.size > 0) return 'consensus';
      if ((state.pendingTasks ?? []).length > 0) return 'distributor';
      return END;
    });
    graph.addEdge('consensus', 'distributor');
  }

  /**
   * Run the workflow
   */
  async runWorkflow(input?: Partial<SwarmState>): Promise<SwarmState> {
    if (!this.graph) {
      throw new Error('Workflow not created. Call createWorkflow first.');
    }

    const compiled = this.graph.compile();
    const result = await compiled.invoke(
      { ...this.state, ...input },
      { configurable: { thread_id: this.config.id } } as RunnableConfig
    );

    this.state = result as SwarmState;
    return this.state;
  }

  /**
   * Create distributor node
   */
  private createDistributorNode() {
    return async (state: SwarmState): Promise<Partial<SwarmState>> => {
      await this.distributeTasks();
      return {
        pendingTasks: this.state.pendingTasks,
        activeTasks: this.state.activeTasks,
        lastUpdate: Date.now(),
      };
    };
  }

  /**
   * Create executor node
   */
  private createExecutorNode() {
    return async (state: SwarmState): Promise<Partial<SwarmState>> => {
      // Tasks are executed asynchronously by agents
      await this.waitForActiveTasks();
      return {
        activeTasks: this.state.activeTasks,
        completedTasks: this.state.completedTasks,
        lastUpdate: Date.now(),
      };
    };
  }

  /**
   * Create aggregator node
   */
  private createAggregatorNode() {
    return async (state: SwarmState): Promise<Partial<SwarmState>> => {
      // Aggregate results from completed tasks
      const results = this.state.completedTasks
        .filter((t) => t.status === 'completed')
        .map((t) => t.result);

      return {
        sharedMemory: {
          ...state.sharedMemory,
          aggregatedResults: results,
        },
        lastUpdate: Date.now(),
      };
    };
  }

  /**
   * Create consensus node
   */
  private createConsensusNode() {
    return async (state: SwarmState): Promise<Partial<SwarmState>> => {
      // Process pending consensus requests
      for (const [id, consensus] of this.activeConsensus) {
        if (consensus.result || Date.now() > consensus.deadline) {
          this.activeConsensus.delete(id);
        }
      }

      return {
        sharedMemory: {
          ...state.sharedMemory,
          consensusResults: Array.from(this.activeConsensus.values())
            .filter((c) => c.result)
            .map((c) => ({ id: c.id, topic: c.topic, result: c.result })),
        },
        lastUpdate: Date.now(),
      };
    };
  }

  /**
   * Wait for active tasks to complete
   */
  private async waitForActiveTasks(timeoutMs: number = 30000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    
    while (this.state.activeTasks.size > 0 && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  /**
   * Get swarm statistics
   */
  getStats(): {
    agentCount: number;
    pendingTasks: number;
    activeTasks: number;
    completedTasks: number;
    successRate: number;
  } {
    const completed = this.state.completedTasks.length;
    const successful = this.state.completedTasks.filter(
      (t) => t.status === 'completed'
    ).length;

    return {
      agentCount: this.agents.size,
      pendingTasks: this.state.pendingTasks.length,
      activeTasks: this.state.activeTasks.size,
      completedTasks: completed,
      successRate: completed > 0 ? successful / completed : 0,
    };
  }

  /**
   * Get current state
   */
  getState(): SwarmState {
    return { ...this.state };
  }

  /**
   * Shutdown the swarm
   */
  async shutdown(): Promise<void> {
    // Cancel pending tasks
    for (const task of this.state.pendingTasks) {
      task.status = 'cancelled';
      this.state.completedTasks.push(task);
    }
    this.state.pendingTasks = [];

    // Clear agents
    this.agents.clear();
    this.state.agents.clear();

    // Close proof generator
    await this.proofGenerator.close();
  }
}
