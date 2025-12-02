/**
 * @fileoverview Aptos Blockchain Integration
 * @description Client for interacting with VerifiAI smart contracts on Aptos
 */

import { 
  Aptos, 
  AptosConfig, 
  Network,
  Account,
  Ed25519PrivateKey,
  InputViewFunctionData,
  InputEntryFunctionData,
} from '@aptos-labs/ts-sdk';

// Configuration
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0x4497111567f83f32715f45d733960c200612c92b1dd7051f3f1cd683aabaf493';
const APTOS_NETWORK = (process.env.NEXT_PUBLIC_APTOS_NETWORK || 'devnet') as Network;

// Initialize Aptos client
const config = new AptosConfig({ network: Network.DEVNET });
const aptos = new Aptos(config);

// Types
export interface ProofData {
  id: string;
  proofType: 'groth16' | 'bulletproofs' | 'hybrid';
  proofData: string;
  publicInputs: string[];
  modelHash: string;
  outputHash: string;
  submitter: string;
  submittedAt: number;
  isVerified: boolean;
  verifiedAt?: number;
}

export interface AgentData {
  id: string;
  owner: string;
  name: string;
  description: string;
  modelHash: string;
  capabilities: number[];
  verifiedActions: number;
  registeredAt: number;
  lastActive: number;
  isActive: boolean;
  reputation: number;
}

export interface VerifierStats {
  totalProofs: number;
  verifiedProofs: number;
  verificationFee: number;
  isPaused: boolean;
}

export interface RegistryStats {
  totalAgents: number;
  activeAgents: number;
  totalSwarms: number;
}

// Proof type constants
const PROOF_TYPE_GROTH16 = 1;
const PROOF_TYPE_BULLETPROOFS = 2;
const PROOF_TYPE_HYBRID = 3;

function getProofTypeNumber(type: string): number {
  switch (type.toLowerCase()) {
    case 'groth16': return PROOF_TYPE_GROTH16;
    case 'bulletproofs': return PROOF_TYPE_BULLETPROOFS;
    case 'hybrid': return PROOF_TYPE_HYBRID;
    default: return PROOF_TYPE_GROTH16;
  }
}

function getProofTypeName(type: number): 'groth16' | 'bulletproofs' | 'hybrid' {
  switch (type) {
    case PROOF_TYPE_GROTH16: return 'groth16';
    case PROOF_TYPE_BULLETPROOFS: return 'bulletproofs';
    case PROOF_TYPE_HYBRID: return 'hybrid';
    default: return 'groth16';
  }
}

// Helper to convert hex string to bytes
function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
  }
  return bytes;
}

// Helper to convert bytes to hex string
function bytesToHex(bytes: Uint8Array): string {
  return '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Helper to generate random bytes
function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  if (typeof crypto !== 'undefined') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return bytes;
}

// Generate proof ID
function generateProofId(): string {
  return bytesToHex(randomBytes(32));
}

// Generate agent ID  
function generateAgentId(): string {
  return bytesToHex(randomBytes(32));
}

/**
 * Aptos Client for VerifiAI Protocol
 */
export class AptosClient {
  private aptos: Aptos;
  private contractAddress: string;

  constructor() {
    this.aptos = aptos;
    this.contractAddress = CONTRACT_ADDRESS;
  }

  // ============ View Functions (Read-only) ============

  /**
   * Get verifier statistics
   */
  async getVerifierStats(): Promise<VerifierStats> {
    try {
      const payload: InputViewFunctionData = {
        function: `${this.contractAddress}::verifier::get_stats`,
        functionArguments: [],
      };
      const result = await this.aptos.view({ payload });
      return {
        totalProofs: Number(result[0]),
        verifiedProofs: Number(result[1]),
        verificationFee: Number(result[2]),
        isPaused: Boolean(result[3]),
      };
    } catch (error) {
      console.error('Failed to get verifier stats:', error);
      // Return default stats if contract view fails
      return {
        totalProofs: 0,
        verifiedProofs: 0,
        verificationFee: 100000,
        isPaused: false,
      };
    }
  }

  /**
   * Get registry statistics
   */
  async getRegistryStats(): Promise<RegistryStats> {
    try {
      const payload: InputViewFunctionData = {
        function: `${this.contractAddress}::registry::get_stats`,
        functionArguments: [],
      };
      const result = await this.aptos.view({ payload });
      return {
        totalAgents: Number(result[0]),
        activeAgents: Number(result[1]),
        totalSwarms: Number(result[2]),
      };
    } catch (error) {
      console.error('Failed to get registry stats:', error);
      return {
        totalAgents: 0,
        activeAgents: 0,
        totalSwarms: 0,
      };
    }
  }

  /**
   * Get proof by ID
   */
  async getProof(proofId: string): Promise<ProofData | null> {
    try {
      const payload: InputViewFunctionData = {
        function: `${this.contractAddress}::verifier::get_proof`,
        functionArguments: [hexToBytes(proofId)],
      };
      const result = await this.aptos.view({ payload });
      
      if (!result || result.length === 0) return null;
      
      const proof = result[0] as any;
      return {
        id: proofId,
        proofType: getProofTypeName(Number(proof.proof_type)),
        proofData: bytesToHex(new Uint8Array(proof.proof_data)),
        publicInputs: proof.public_inputs.map((input: number[]) => bytesToHex(new Uint8Array(input))),
        modelHash: bytesToHex(new Uint8Array(proof.model_hash)),
        outputHash: bytesToHex(new Uint8Array(proof.output_hash)),
        submitter: proof.submitter,
        submittedAt: Number(proof.submitted_at),
        isVerified: proof.is_verified,
        verifiedAt: proof.verified_at ? Number(proof.verified_at) : undefined,
      };
    } catch (error) {
      console.error('Failed to get proof:', error);
      return null;
    }
  }

  /**
   * Get agent by ID
   */
  async getAgent(agentId: string): Promise<AgentData | null> {
    try {
      const payload: InputViewFunctionData = {
        function: `${this.contractAddress}::registry::get_agent`,
        functionArguments: [hexToBytes(agentId)],
      };
      const result = await this.aptos.view({ payload });
      
      if (!result || result.length === 0) return null;
      
      const agent = result[0] as any;
      return {
        id: agentId,
        owner: agent.owner,
        name: agent.name,
        description: agent.description,
        modelHash: bytesToHex(new Uint8Array(agent.model_hash)),
        capabilities: agent.capabilities.map((cap: any) => cap.cap_type),
        verifiedActions: Number(agent.verified_actions),
        registeredAt: Number(agent.registered_at),
        lastActive: Number(agent.last_active),
        isActive: agent.is_active,
        reputation: Number(agent.reputation),
      };
    } catch (error) {
      console.error('Failed to get agent:', error);
      return null;
    }
  }

  /**
   * Get user's proof IDs
   */
  async getUserProofs(userAddress: string): Promise<string[]> {
    try {
      const payload: InputViewFunctionData = {
        function: `${this.contractAddress}::verifier::get_user_proofs`,
        functionArguments: [userAddress],
      };
      const result = await this.aptos.view({ payload });
      return (result[0] as number[][]).map((id: number[]) => bytesToHex(new Uint8Array(id)));
    } catch (error) {
      console.error('Failed to get user proofs:', error);
      return [];
    }
  }

  /**
   * Get user's agents
   */
  async getUserAgents(userAddress: string): Promise<string[]> {
    try {
      const payload: InputViewFunctionData = {
        function: `${this.contractAddress}::registry::get_user_agents`,
        functionArguments: [userAddress],
      };
      const result = await this.aptos.view({ payload });
      return (result[0] as number[][]).map((id: number[]) => bytesToHex(new Uint8Array(id)));
    } catch (error) {
      console.error('Failed to get user agents:', error);
      return [];
    }
  }

  // ============ Transaction Functions (Write) ============

  /**
   * Submit a new proof (requires wallet connection)
   */
  async submitProof(params: {
    proofType: 'groth16' | 'bulletproofs' | 'hybrid';
    proofData: string;
    publicInputs: string[];
    modelHash: string;
    outputHash: string;
    signAndSubmit: (payload: InputEntryFunctionData) => Promise<{ hash: string }>;
  }): Promise<{ proofId: string; txHash: string }> {
    const proofId = generateProofId();
    
    const payload: InputEntryFunctionData = {
      function: `${this.contractAddress}::verifier::submit_proof`,
      functionArguments: [
        hexToBytes(proofId),
        getProofTypeNumber(params.proofType),
        hexToBytes(params.proofData),
        params.publicInputs.map(input => hexToBytes(input)),
        hexToBytes(params.modelHash),
        hexToBytes(params.outputHash),
      ],
    };

    const result = await params.signAndSubmit(payload);
    return { proofId, txHash: result.hash };
  }

  /**
   * Verify a proof on-chain
   */
  async verifyProof(params: {
    proofId: string;
    signAndSubmit: (payload: InputEntryFunctionData) => Promise<{ hash: string }>;
  }): Promise<{ txHash: string; verified: boolean }> {
    const payload: InputEntryFunctionData = {
      function: `${this.contractAddress}::verifier::verify_proof`,
      functionArguments: [hexToBytes(params.proofId)],
    };

    const result = await params.signAndSubmit(payload);
    return { txHash: result.hash, verified: true };
  }

  /**
   * Register a new agent
   */
  async registerAgent(params: {
    name: string;
    description: string;
    metadataUri: string;
    modelHash: string;
    capabilities: number[];
    signAndSubmit: (payload: InputEntryFunctionData) => Promise<{ hash: string }>;
  }): Promise<{ agentId: string; txHash: string }> {
    const agentId = generateAgentId();
    
    const payload: InputEntryFunctionData = {
      function: `${this.contractAddress}::registry::register_agent`,
      functionArguments: [
        hexToBytes(agentId),
        params.name,
        params.description,
        params.metadataUri,
        hexToBytes(params.modelHash),
        params.capabilities,
      ],
    };

    const result = await params.signAndSubmit(payload);
    return { agentId, txHash: result.hash };
  }

  /**
   * Update agent activity
   */
  async updateAgentActivity(params: {
    agentId: string;
    signAndSubmit: (payload: InputEntryFunctionData) => Promise<{ hash: string }>;
  }): Promise<{ txHash: string }> {
    const payload: InputEntryFunctionData = {
      function: `${this.contractAddress}::registry::update_activity`,
      functionArguments: [hexToBytes(params.agentId)],
    };

    const result = await params.signAndSubmit(payload);
    return { txHash: result.hash };
  }

  /**
   * Create a new swarm
   */
  async createSwarm(params: {
    name: string;
    description: string;
    quorumSize: number;
    consensusThreshold: number;
    signAndSubmit: (payload: InputEntryFunctionData) => Promise<{ hash: string }>;
  }): Promise<{ swarmId: string; txHash: string }> {
    const swarmId = bytesToHex(randomBytes(32));
    
    const payload: InputEntryFunctionData = {
      function: `${this.contractAddress}::coordinator::create_swarm`,
      functionArguments: [
        hexToBytes(swarmId),
        params.name,
        params.description,
        params.quorumSize,
        Math.floor(params.consensusThreshold * 100), // Convert to basis points
      ],
    };

    const result = await params.signAndSubmit(payload);
    return { swarmId, txHash: result.hash };
  }

  /**
   * Create a settlement
   */
  async createSettlement(params: {
    settlementType: number;
    amount: number;
    parties: string[];
    requiredProofs: number;
    signAndSubmit: (payload: InputEntryFunctionData) => Promise<{ hash: string }>;
  }): Promise<{ settlementId: string; txHash: string }> {
    const settlementId = bytesToHex(randomBytes(32));
    
    const payload: InputEntryFunctionData = {
      function: `${this.contractAddress}::settlement::create_settlement`,
      functionArguments: [
        hexToBytes(settlementId),
        params.settlementType,
        params.amount,
        params.parties,
        params.requiredProofs,
      ],
    };

    const result = await params.signAndSubmit(payload);
    return { settlementId, txHash: result.hash };
  }
}

// Export singleton instance
export const aptosClient = new AptosClient();
export default aptosClient;
