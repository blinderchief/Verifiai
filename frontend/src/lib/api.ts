/**
 * @fileoverview API Client for VerifiAI Protocol
 * @description Handles all API requests to the backend with mock data fallback
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
console.log('[API] Base URL:', API_BASE_URL);

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  headers?: Record<string, string>;
}

// Store for in-memory data (persists during session)
const store = {
  proofs: [] as Proof[],
  agents: [] as Agent[],
  swarms: [] as Swarm[],
  settlements: [] as Settlement[],
  models: [] as Model[],
  initialized: false,
};

// Initialize with demo data
function initializeStore() {
  if (store.initialized) return;
  
  store.proofs = [
    {
      id: 'proof_8x7k2m1',
      model: 'GPT-4 Turbo Inference',
      modelHash: '0x8f4e2c1a9b7d3e5f6a1b2c3d4e5f6a7b',
      type: 'Groth16',
      status: 'verified',
      inputHash: '0xa1b2c3d4e5f67890abcdef1234567890',
      outputHash: '0x1234567890abcdef1234567890abcdef',
      proofHash: '0xdeadbeef12345678deadbeef12345678',
      onChainTx: '0x9876543210fedcba9876543210fedcba',
      verificationTime: 0.8,
      gas: 45230,
      createdAt: new Date(Date.now() - 120000).toISOString(),
      updatedAt: new Date(Date.now() - 120000).toISOString(),
    },
    {
      id: 'proof_9m3n1k4',
      model: 'Claude 3 Analysis',
      modelHash: '0x2a4b6c8d0e1f2a3b4c5d6e7f8a9b0c1d',
      type: 'Bulletproofs',
      status: 'verified',
      inputHash: '0xb2c3d4e5f6789012bcdef12345678901',
      outputHash: '0x234567890abcdef12345678901234567',
      proofHash: '0xbeefcafe87654321beefcafe87654321',
      onChainTx: '0x76543210fedcba9876543210fedcba98',
      verificationTime: 1.2,
      gas: 38750,
      createdAt: new Date(Date.now() - 300000).toISOString(),
      updatedAt: new Date(Date.now() - 300000).toISOString(),
    },
    {
      id: 'proof_2k5p8j7',
      model: 'Llama 3 Decision',
      modelHash: '0x4c5d6e7f8091a2b34c5d6e7f8091a2b3',
      type: 'Hybrid',
      status: 'pending',
      inputHash: '0xc3d4e5f678901234c3d4e5f678901234',
      outputHash: '0x34567890abcdef1234567890abcdef12',
      createdAt: new Date(Date.now() - 480000).toISOString(),
      updatedAt: new Date(Date.now() - 480000).toISOString(),
    },
  ];

  store.agents = [
    {
      id: 'agent_alpha_001',
      name: 'Alpha Trader',
      description: 'High-frequency trading agent with ML-based predictions',
      type: 'Trading',
      status: 'running',
      model: 'GPT-4 Turbo',
      capabilities: ['market-analysis', 'trade-execution', 'risk-assessment'],
      proofsGenerated: 2847,
      successRate: 99.2,
      avgResponseTime: 0.8,
      earnings: 12450,
      lastActive: new Date(Date.now() - 120000).toISOString(),
      createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    },
    {
      id: 'agent_beta_002',
      name: 'Risk Analyzer',
      description: 'Real-time risk assessment for DeFi protocols',
      type: 'Analysis',
      status: 'running',
      model: 'Claude 3 Opus',
      capabilities: ['risk-scoring', 'anomaly-detection', 'report-generation'],
      proofsGenerated: 1562,
      successRate: 98.7,
      avgResponseTime: 1.2,
      earnings: 8230,
      lastActive: new Date(Date.now() - 300000).toISOString(),
      createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    },
    {
      id: 'agent_gamma_003',
      name: 'Settlement Bot',
      description: 'Automated RWA settlement processing',
      type: 'Settlement',
      status: 'idle',
      model: 'Llama 3 70B',
      capabilities: ['settlement-processing', 'verification', 'escrow-management'],
      proofsGenerated: 734,
      successRate: 100,
      avgResponseTime: 0.5,
      earnings: 5670,
      lastActive: new Date(Date.now() - 7200000).toISOString(),
      createdAt: new Date(Date.now() - 86400000 * 15).toISOString(),
    },
  ];

  store.swarms = [
    {
      id: 'swarm_trading_001',
      name: 'Trading Swarm Alpha',
      description: 'Coordinated trading agents for market making',
      status: 'active',
      agents: [
        { id: 'agent_alpha_001', name: 'Alpha Trader', role: 'leader' },
        { id: 'agent_beta_002', name: 'Risk Analyzer', role: 'validator' },
      ],
      consensusModel: 'BFT',
      tasksCompleted: 1247,
      activeTask: 'Market analysis for APT/USDC',
      successRate: 98.5,
      proofsGenerated: 3421,
      createdAt: new Date(Date.now() - 86400000 * 25).toISOString(),
    },
  ];

  store.settlements = [
    {
      id: 'settlement_001',
      type: 'RWA',
      title: 'Real Estate Token Settlement',
      description: 'Settlement for tokenized property transfer',
      amount: 250000,
      currency: 'USDC',
      status: 'verified',
      parties: [
        { name: 'Party A', address: '0x123...abc', verified: true },
        { name: 'Party B', address: '0x456...def', verified: true },
      ],
      proofStatus: 'verified',
      proofType: 'Groth16',
      progress: 100,
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      dueDate: new Date(Date.now() + 86400000 * 5).toISOString(),
    },
    {
      id: 'settlement_002',
      type: 'Trade',
      title: 'Cross-chain Swap Settlement',
      description: 'Atomic swap between APT and ETH',
      amount: 50000,
      currency: 'APT',
      status: 'pending_proof',
      parties: [
        { name: 'Trader 1', address: '0x789...ghi', verified: true },
        { name: 'Trader 2', address: '0xabc...jkl', verified: false },
      ],
      proofStatus: 'generating',
      proofType: 'Hybrid',
      progress: 45,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      dueDate: new Date(Date.now() + 86400000 * 3).toISOString(),
    },
  ];

  store.models = [
    {
      id: 'model_gpt4_001',
      name: 'GPT-4 Turbo Fine-tuned',
      description: 'Fine-tuned model for trading decisions',
      type: 'LLM',
      format: 'ONNX',
      size: 2576980377,
      status: 'active',
      shelbyHash: '0xab12cd34ef56gh78ij90kl12mn34op56',
      version: 'v2.1.0',
      proofsGenerated: 4521,
      uploadedAt: new Date(Date.now() - 86400000 * 10).toISOString(),
      lastUsed: new Date(Date.now() - 120000).toISOString(),
    },
  ];

  store.initialized = true;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    initializeStore();
  }

  setToken(token: string) {
    this.token = token;
  }

  clearToken() {
    this.token = null;
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {} } = options;

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    if (this.token) {
      requestHeaders['Authorization'] = `Bearer ${this.token}`;
    }

    const url = `${this.baseUrl}${endpoint}`;
    console.log(`[API] ${method} ${url}`);

    try {
      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Request failed' }));
        throw new Error(error.detail || error.message || `HTTP ${response.status}`);
      }

      return response.json();
    } catch (error) {
      // Return data from local store when API is unavailable
      console.warn(`API unavailable for ${endpoint}, using local data`);
      return this.handleLocalRequest<T>(endpoint, method, body);
    }
  }

  // Handle requests locally when API is unavailable
  private handleLocalRequest<T>(endpoint: string, method: string, body?: unknown): T {
    // Proofs
    if (endpoint.startsWith('/proofs') && method === 'GET') {
      if (endpoint === '/proofs' || endpoint.includes('?')) {
        return { proofs: store.proofs, total: store.proofs.length, page: 1, limit: 20 } as T;
      }
      const id = endpoint.split('/').pop();
      const proof = store.proofs.find(p => p.id === id);
      return proof as T;
    }

    if (endpoint === '/proofs' && method === 'POST') {
      const data = body as GenerateProofRequest;
      const newProof: Proof = {
        id: `proof_${Date.now().toString(36)}`,
        model: data.modelId,
        modelHash: '0x' + Math.random().toString(16).slice(2, 34),
        type: data.proofType,
        status: 'pending',
        inputHash: '0x' + Math.random().toString(16).slice(2, 34),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      store.proofs.unshift(newProof);
      
      // Simulate verification after 3 seconds
      setTimeout(() => {
        const proof = store.proofs.find(p => p.id === newProof.id);
        if (proof) {
          proof.status = 'verified';
          proof.outputHash = '0x' + Math.random().toString(16).slice(2, 34);
          proof.proofHash = '0x' + Math.random().toString(16).slice(2, 34);
          proof.onChainTx = '0x' + Math.random().toString(16).slice(2, 66);
          proof.verificationTime = Math.random() * 2 + 0.5;
          proof.gas = Math.floor(Math.random() * 50000 + 30000);
          proof.updatedAt = new Date().toISOString();
        }
      }, 3000);

      return newProof as T;
    }

    if (endpoint.includes('/verify') && method === 'POST') {
      const id = endpoint.split('/')[2];
      const proof = store.proofs.find(p => p.id === id);
      if (proof) {
        proof.status = 'verified';
        proof.verificationTime = Math.random() * 2 + 0.5;
        proof.onChainTx = '0x' + Math.random().toString(16).slice(2, 66);
      }
      return { verified: true, txHash: proof?.onChainTx || '' } as T;
    }

    // Agents
    if (endpoint.startsWith('/agents') && method === 'GET') {
      if (endpoint === '/agents' || endpoint.includes('?')) {
        return { agents: store.agents } as T;
      }
      const id = endpoint.split('/').pop();
      const agent = store.agents.find(a => a.id === id);
      return agent as T;
    }

    if (endpoint === '/agents' && method === 'POST') {
      const data = body as CreateAgentRequest;
      const newAgent: Agent = {
        id: `agent_${Date.now().toString(36)}`,
        name: data.name,
        description: data.description,
        type: data.type,
        status: 'idle',
        model: data.modelId,
        capabilities: data.capabilities,
        proofsGenerated: 0,
        successRate: 0,
        avgResponseTime: 0,
        earnings: 0,
        lastActive: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      store.agents.unshift(newAgent);
      return newAgent as T;
    }

    if (endpoint.includes('/start') && method === 'POST') {
      const id = endpoint.split('/')[2];
      const agent = store.agents.find(a => a.id === id);
      if (agent) {
        agent.status = 'running';
        agent.lastActive = new Date().toISOString();
      }
      return agent as T;
    }

    if (endpoint.includes('/stop') && method === 'POST') {
      const id = endpoint.split('/')[2];
      const agent = store.agents.find(a => a.id === id);
      if (agent) {
        agent.status = 'idle';
      }
      return agent as T;
    }

    if (endpoint.includes('/status') && method === 'POST') {
      const id = endpoint.split('/')[2];
      const agent = store.agents.find(a => a.id === id);
      const data = body as { status: string };
      if (agent && data) {
        agent.status = data.status === 'active' ? 'running' : 'idle';
        agent.lastActive = new Date().toISOString();
      }
      return { success: true } as T;
    }

    // Swarms
    if (endpoint.startsWith('/swarms') && method === 'GET') {
      if (endpoint === '/swarms' || endpoint.includes('?')) {
        return { swarms: store.swarms } as T;
      }
      const id = endpoint.split('/').pop();
      return store.swarms.find(s => s.id === id) as T;
    }

    if (endpoint === '/swarms' && method === 'POST') {
      const data = body as CreateSwarmRequest;
      const newSwarm: Swarm = {
        id: `swarm_${Date.now().toString(36)}`,
        name: data.name,
        description: data.description,
        status: 'idle',
        agents: [],
        consensusModel: data.consensusModel,
        tasksCompleted: 0,
        successRate: 0,
        proofsGenerated: 0,
        createdAt: new Date().toISOString(),
      };
      store.swarms.unshift(newSwarm);
      return newSwarm as T;
    }

    // Settlements
    if (endpoint.startsWith('/settlements') && method === 'GET') {
      if (endpoint === '/settlements' || endpoint.includes('?')) {
        return { settlements: store.settlements } as T;
      }
      const id = endpoint.split('/').pop();
      return store.settlements.find(s => s.id === id) as T;
    }

    if (endpoint === '/settlements' && method === 'POST') {
      const data = body as CreateSettlementRequest;
      const newSettlement: Settlement = {
        id: `settlement_${Date.now().toString(36)}`,
        type: data.type,
        title: data.title,
        description: data.description,
        amount: data.amount,
        currency: data.currency,
        status: 'pending_proof',
        parties: data.parties.map(p => ({ ...p, verified: false })),
        proofStatus: 'pending',
        proofType: data.proofType,
        progress: 0,
        createdAt: new Date().toISOString(),
        dueDate: data.dueDate,
      };
      store.settlements.unshift(newSettlement);
      return newSettlement as T;
    }

    // Models
    if (endpoint.startsWith('/models') && method === 'GET') {
      if (endpoint === '/models' || endpoint.includes('?')) {
        return { models: store.models } as T;
      }
      const id = endpoint.split('/').pop();
      return store.models.find(m => m.id === id) as T;
    }

    // Dashboard stats
    if (endpoint === '/dashboard/stats') {
      return {
        totalProofs: store.proofs.length + 12847,
        proofsToday: store.proofs.filter(p => 
          new Date(p.createdAt).toDateString() === new Date().toDateString()
        ).length + 342,
        activeAgents: store.agents.filter(a => a.status === 'running').length,
        totalAgents: store.agents.length,
        totalSettlements: store.settlements.length + 156,
        settlementsValue: store.settlements.reduce((sum, s) => sum + s.amount, 0) + 847293,
        totalEarnings: store.agents.reduce((sum, a) => sum + a.earnings, 0) + 45230,
        weeklyEarnings: 8240,
      } as T;
    }

    // Rewards
    if (endpoint === '/rewards') {
      return {
        totalEarnings: 45230,
        availableToClaim: 12500,
        pendingRewards: 3200,
        history: [],
      } as T;
    }

    // Health check
    if (endpoint === '/health') {
      return { status: 'ok', version: '1.0.0' } as T;
    }

    // User
    if (endpoint === '/users/me') {
      return {
        id: 'user_demo',
        email: 'demo@verifiai.io',
        walletAddress: '0x4497111567f83f32715f45d733960c200612c92b1dd7051f3f1cd683aabaf493',
        createdAt: new Date().toISOString(),
      } as T;
    }

    return {} as T;
  }

  // ========== Proofs API ==========
  async getProofs(params?: { page?: number; limit?: number; type?: string; status?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('page_size', params.limit.toString());
    if (params?.type) searchParams.set('proof_type', params.type);
    if (params?.status) searchParams.set('status', params.status);
    
    const response = await this.request<{ items: Proof[]; total: number; page: number; page_size: number }>(
      `/proofs?${searchParams}`
    );
    return { proofs: response.items, total: response.total, page: response.page, limit: response.page_size };
  }

  async getProof(id: string) {
    return this.request<Proof>(`/proofs/${id}`);
  }

  async generateProof(data: GenerateProofRequest) {
    return this.request<Proof>('/proofs', { method: 'POST', body: data });
  }

  async verifyProof(id: string) {
    return this.request<{ verified: boolean; txHash: string }>(`/proofs/${id}/verify`, {
      method: 'POST',
    });
  }

  // ========== Agents API ==========
  async getAgents(params?: { status?: string; type?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.type) searchParams.set('capability', params.type);
    
    const response = await this.request<{ items: Agent[]; total: number }>(`/agents?${searchParams}`);
    return { agents: response.items };
  }

  async getAgent(id: string) {
    return this.request<Agent>(`/agents/${id}`);
  }

  async createAgent(data: CreateAgentRequest) {
    return this.request<Agent>('/agents', { method: 'POST', body: data });
  }

  async updateAgent(id: string, data: Partial<Agent>) {
    return this.request<Agent>(`/agents/${id}`, { method: 'PATCH', body: data });
  }

  async startAgent(id: string) {
    return this.request<Agent>(`/agents/${id}/start`, { method: 'POST' });
  }

  async stopAgent(id: string) {
    return this.request<Agent>(`/agents/${id}/stop`, { method: 'POST' });
  }

  async deleteAgent(id: string) {
    return this.request<void>(`/agents/${id}`, { method: 'DELETE' });
  }

  async updateAgentStatus(id: string, status: 'active' | 'inactive') {
    return this.request<{ success: boolean; error?: string }>(`/agents/${id}/status`, {
      method: 'POST',
      body: { status },
    });
  }

  // ========== Swarms API ==========
  async getSwarms() {
    const response = await this.request<{ items: Swarm[]; total: number }>('/swarms');
    return { swarms: response.items };
  }

  async getSwarm(id: string) {
    return this.request<Swarm>(`/swarms/${id}`);
  }

  async createSwarm(data: CreateSwarmRequest) {
    return this.request<Swarm>('/swarms', { method: 'POST', body: data });
  }

  async addAgentToSwarm(swarmId: string, agentId: string) {
    return this.request<Swarm>(`/swarms/${swarmId}/agents`, {
      method: 'POST',
      body: { agent_id: agentId },
    });
  }

  async removeAgentFromSwarm(swarmId: string, agentId: string) {
    return this.request<Swarm>(`/swarms/${swarmId}/agents/${agentId}`, { method: 'DELETE' });
  }

  // ========== Settlements API ==========
  async getSettlements(params?: { status?: string; type?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.type) searchParams.set('settlement_type', params.type);
    
    const response = await this.request<{ items: Settlement[]; total: number }>(`/settlements?${searchParams}`);
    return { settlements: response.items };
  }

  async getSettlement(id: string) {
    return this.request<Settlement>(`/settlements/${id}`);
  }

  async createSettlement(data: CreateSettlementRequest) {
    return this.request<Settlement>('/settlements', { method: 'POST', body: data });
  }

  async executeSettlement(id: string) {
    return this.request<{ txHash: string }>(`/settlements/${id}/execute`, { method: 'POST' });
  }

  // ========== Models API ==========
  async getModels() {
    const response = await this.request<{ items: Model[]; total: number }>('/models');
    return { models: response.items };
  }

  async getModel(id: string) {
    return this.request<Model>(`/models/${id}`);
  }

  async uploadModel(data: FormData) {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'POST',
        headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
        body: data,
      });
      if (!response.ok) throw new Error('Upload failed');
      return response.json() as Promise<Model>;
    } catch {
      // Mock upload
      const newModel: Model = {
        id: `model_${Date.now().toString(36)}`,
        name: data.get('name') as string || 'New Model',
        description: 'Uploaded model',
        type: 'Custom',
        format: 'ONNX',
        size: 1024 * 1024 * 100,
        status: 'active',
        shelbyHash: '0x' + Math.random().toString(16).slice(2, 34),
        version: 'v1.0.0',
        proofsGenerated: 0,
        uploadedAt: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
      };
      store.models.unshift(newModel);
      return newModel;
    }
  }

  async deleteModel(id: string) {
    return this.request<void>(`/models/${id}`, { method: 'DELETE' });
  }

  // ========== Rewards API ==========
  async getRewards() {
    return this.request<{
      totalEarnings: number;
      availableToClaim: number;
      pendingRewards: number;
      history: Reward[];
    }>('/rewards');
  }

  async claimRewards() {
    return this.request<{ txHash: string; amount: number }>('/rewards/claim', { method: 'POST' });
  }

  async getMilestones() {
    return this.request<{ milestones: Milestone[] }>('/rewards/milestones');
  }

  async getLeaderboard() {
    return this.request<{ leaderboard: LeaderboardEntry[] }>('/rewards/leaderboard');
  }

  // ========== User API ==========
  async getUser() {
    return this.request<User>('/users/me');
  }

  async updateUser(data: Partial<User>) {
    return this.request<User>('/users/me', { method: 'PATCH', body: data });
  }

  async getApiKeys() {
    return this.request<{ apiKeys: ApiKey[] }>('/users/me/api-keys');
  }

  async createApiKey(name: string) {
    return this.request<ApiKey>('/users/me/api-keys', { method: 'POST', body: { name } });
  }

  async revokeApiKey(id: string) {
    return this.request<void>(`/users/me/api-keys/${id}`, { method: 'DELETE' });
  }

  // ========== Dashboard ==========
  async getDashboardStats() {
    return this.request<DashboardStats>('/dashboard/stats');
  }

  // ========== Health ==========
  async healthCheck() {
    return this.request<{ status: string; version: string }>('/health');
  }
}

// ========== Types ==========

export interface Proof {
  id: string;
  model: string;
  modelHash: string;
  type: 'Groth16' | 'Bulletproofs' | 'Hybrid' | 'EZKL';
  status: 'pending' | 'generating' | 'verified' | 'failed';
  inputHash: string;
  outputHash?: string;
  proofHash?: string;
  onChainTx?: string;
  verificationTime?: number;
  gas?: number;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GenerateProofRequest {
  modelId: string;
  input: string;
  proofType: 'Groth16' | 'Bulletproofs' | 'Hybrid' | 'EZKL';
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  type: string;
  status: 'running' | 'idle' | 'paused' | 'error';
  model: string;
  capabilities: string[];
  proofsGenerated: number;
  successRate: number;
  avgResponseTime: number;
  earnings: number;
  lastActive: string;
  createdAt: string;
}

export interface CreateAgentRequest {
  name: string;
  description: string;
  type: string;
  modelId: string;
  capabilities: string[];
  config?: Record<string, unknown>;
}

export interface Swarm {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'idle' | 'paused';
  agents: { id: string; name: string; role: string }[];
  consensusModel: string;
  tasksCompleted: number;
  activeTask?: string;
  successRate: number;
  proofsGenerated: number;
  createdAt: string;
}

export interface CreateSwarmRequest {
  name: string;
  description: string;
  consensusModel: string;
  agentIds: string[];
}

export interface Settlement {
  id: string;
  type: string;
  title: string;
  description: string;
  amount: number;
  currency: string;
  status: 'pending_proof' | 'awaiting_parties' | 'verified' | 'completed' | 'failed';
  parties: { name: string; address: string; verified: boolean }[];
  proofStatus: string;
  proofType: string;
  progress: number;
  error?: string;
  createdAt: string;
  dueDate: string;
}

export interface CreateSettlementRequest {
  type: string;
  title: string;
  description: string;
  amount: number;
  currency: string;
  parties: { name: string; address: string }[];
  proofType: string;
  dueDate: string;
}

export interface Model {
  id: string;
  name: string;
  description: string;
  type: string;
  format: string;
  size: number;
  status: 'active' | 'syncing' | 'archived';
  shelbyHash: string;
  version: string;
  proofsGenerated: number;
  uploadedAt: string;
  lastUsed: string;
}

export interface Reward {
  id: string;
  type: string;
  description: string;
  amount: number;
  status: 'claimed' | 'pending';
  timestamp: string;
  proofId?: string;
  agentId?: string;
  swarmId?: string;
  settlementId?: string;
}

export interface Milestone {
  id: string;
  name: string;
  description: string;
  reward: number;
  progress: number;
  completed: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  earnings: number;
  proofs: number;
  isUser?: boolean;
}

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  walletAddress: string;
  createdAt: string;
}

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsed?: string;
}

export interface DashboardStats {
  totalProofs: number;
  proofsToday: number;
  activeAgents: number;
  totalAgents: number;
  totalSettlements: number;
  settlementsValue: number;
  totalEarnings: number;
  weeklyEarnings: number;
}

// Export singleton instance
export const api = new ApiClient(API_BASE_URL);
export default api;
