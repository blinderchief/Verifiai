/**
 * @fileoverview Main Proof Generator
 * @description Unified interface for all proof generation methods
 */

import { ProofType, sha3HashHex } from '@verifiai/core';
import { 
  GeneratedProof, 
  Groth16Proof, 
  BulletproofsRangeProof, 
  HybridProof,
  InferenceResult,
} from './types';
import { ONNXInferenceEngine, createInputTensor } from './inference';
import { Groth16Prover, Groth16ProverConfig } from './groth16-prover';
import { BulletproofsProver, BulletproofsConfig } from './bulletproofs-prover';
import { HybridProver, HybridProverConfig, TEEProvider } from './hybrid-prover';
import { EZKLProver } from './ezkl-prover';

/**
 * Proof generation strategy configuration
 */
export interface ProofGeneratorConfig {
  /** Default proof type */
  defaultProofType: ProofType;
  /** Groth16 configuration */
  groth16?: Groth16ProverConfig;
  /** Bulletproofs configuration */
  bulletproofs?: BulletproofsConfig;
  /** Hybrid prover configuration */
  hybrid?: HybridProverConfig;
  /** EZKL working directory */
  ezklWorkingDir?: string;
  /** Cache directory for proofs */
  cacheDir?: string;
  /** Enable proof caching */
  enableCaching?: boolean;
}

/**
 * Proof generation request
 */
export interface ProofRequest {
  /** Model identifier */
  modelId: string;
  /** Input data for inference */
  inputs: number[];
  /** Expected outputs for verification */
  outputs: number[];
  /** Model hash for integrity */
  modelHash: string;
  /** Request timestamp */
  timestamp: number;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
  /** Type of proof to generate */
  proofType: ProofType;
  /** ONNX model path */
  modelPath: string;
  /** Input data for inference (legacy) */
  inputData: Float32Array | Float64Array;
  /** Input shape */
  inputShape: number[];
  /** Input name (for ONNX) */
  inputName?: string;
  /** Additional circuit inputs */
  circuitInputs?: Record<string, bigint | bigint[]>;
  /** Range bounds for Bulletproofs */
  rangeBounds?: { min: bigint; max: bigint };
  /** TEE provider for hybrid proofs */
  teeProvider?: TEEProvider;
  /** Cache key for reusing proofs */
  cacheKey?: string;
}

/**
 * Proof generation result with metadata
 */
export interface ProofResult {
  /** Generated proof */
  proof: GeneratedProof;
  /** Inference result */
  inferenceResult: InferenceResult;
  /** Total time including inference */
  totalTimeMs: number;
  /** Whether result was cached */
  fromCache: boolean;
}

/**
 * Main proof generator - unified interface for all proof types
 */
export class ProofGenerator {
  private config: ProofGeneratorConfig;
  private inferenceEngine: ONNXInferenceEngine;
  private groth16Prover?: Groth16Prover;
  private bulletproofsProver?: BulletproofsProver;
  private hybridProver?: HybridProver;
  private ezklProvers: Map<string, EZKLProver> = new Map();
  private proofCache: Map<string, ProofResult> = new Map();
  private initialized: boolean = false;

  constructor(config: ProofGeneratorConfig) {
    this.config = {
      enableCaching: true,
      ...config,
    };
    this.inferenceEngine = new ONNXInferenceEngine();
  }

  /**
   * Initialize all configured provers
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Initialize Groth16 prover
    if (this.config.groth16) {
      this.groth16Prover = new Groth16Prover(this.config.groth16);
      await this.groth16Prover.initialize();
    }

    // Initialize Bulletproofs prover
    if (this.config.bulletproofs) {
      this.bulletproofsProver = new BulletproofsProver(this.config.bulletproofs);
    }

    // Initialize Hybrid prover
    if (this.config.hybrid) {
      this.hybridProver = new HybridProver(this.config.hybrid);
      await this.hybridProver.initialize();
    }

    this.initialized = true;
  }

  /**
   * Generate a proof for AI inference
   */
  async generateProof(request: ProofRequest): Promise<ProofResult> {
    const startTime = performance.now();

    // Check cache
    if (this.config.enableCaching && request.cacheKey) {
      const cached = this.proofCache.get(request.cacheKey);
      if (cached) {
        return { ...cached, fromCache: true };
      }
    }

    // Load model if needed
    await this.inferenceEngine.loadModel({
      modelPath: request.modelPath,
      inputNames: [request.inputName ?? 'input'],
      outputNames: ['output'],
      inputShape: request.inputShape,
      inputShapes: [request.inputShape],
      outputShape: [],
    });

    // Run inference
    const inferenceResult = await this.inferenceEngine.runInference([
      createInputTensor(
        request.inputData,
        request.inputShape,
        request.inputName ?? 'input'
      ),
    ]);

    // Generate proof based on type
    let proof: GeneratedProof;
    
    switch (request.proofType) {
      case ProofType.GROTH16:
        proof = await this.generateGroth16Proof(inferenceResult, request);
        break;
      case ProofType.BULLETPROOFS:
        proof = await this.generateBulletproofsProof(inferenceResult, request);
        break;
      case ProofType.HYBRID:
        proof = await this.generateHybridProof(inferenceResult, request);
        break;
      default:
        throw new Error(`Unsupported proof type: ${request.proofType}`);
    }

    const totalTimeMs = performance.now() - startTime;

    const result: ProofResult = {
      proof,
      inferenceResult,
      totalTimeMs,
      fromCache: false,
    };

    // Cache result
    if (this.config.enableCaching && request.cacheKey) {
      this.proofCache.set(request.cacheKey, result);
    }

    return result;
  }

  /**
   * Generate Groth16 proof
   */
  private async generateGroth16Proof(
    inferenceResult: InferenceResult,
    request: ProofRequest
  ): Promise<GeneratedProof> {
    if (!this.groth16Prover) {
      throw new Error('Groth16 prover not configured');
    }

    return this.groth16Prover.generateProof(request);
  }

  /**
   * Generate Bulletproofs proof
   */
  private async generateBulletproofsProof(
    inferenceResult: InferenceResult,
    request: ProofRequest
  ): Promise<GeneratedProof> {
    if (!this.bulletproofsProver) {
      // Create a default prover
      this.bulletproofsProver = new BulletproofsProver({
        bitSize: 64,
      });
    }

    return this.bulletproofsProver.generateFromInference(
      inferenceResult,
      0,
      request.rangeBounds?.min ?? 0n,
      request.rangeBounds?.max ?? 1000000000n
    );
  }

  /**
   * Generate Hybrid proof
   */
  private async generateHybridProof(
    inferenceResult: InferenceResult,
    request: ProofRequest
  ): Promise<GeneratedProof> {
    if (!this.hybridProver && this.config.hybrid) {
      this.hybridProver = new HybridProver(this.config.hybrid);
      await this.hybridProver.initialize();
    }

    if (!this.hybridProver) {
      // Create default hybrid prover
      this.hybridProver = new HybridProver({
        teeProvider: request.teeProvider ?? 'sgx',
        includeGroth16: !!this.config.groth16,
        includeBulletproofs: true,
        groth16Config: this.config.groth16,
        bulletproofsConfig: this.config.bulletproofs ?? { bitSize: 64 },
        securityLevel: 2,
      });
      await this.hybridProver.initialize();
    }

    return this.hybridProver.generateHybridProof(inferenceResult);
  }

  /**
   * Generate proof using EZKL
   */
  async generateEZKLProof(
    modelPath: string,
    inputData: number[][]
  ): Promise<GeneratedProof> {
    // Get or create EZKL prover for model
    let prover = this.ezklProvers.get(modelPath);
    
    if (!prover) {
      const workingDir = this.config.ezklWorkingDir ?? './ezkl-work';
      prover = new EZKLProver({
        modelPath,
        workingDir,
        proofSystem: 'groth16',
        scaleBits: 16,
        lookupBits: 14,
        logRows: 16,
        inputShape: inputData[0]?.length ? [inputData[0].length] : [1],
      });
      await prover.setup();
      this.ezklProvers.set(modelPath, prover);
    }

    return prover.generateProof(inputData);
  }

  /**
   * Verify a proof
   */
  async verifyProof(
    proof: GeneratedProof,
    proofType: ProofType
  ): Promise<boolean> {
    switch (proofType) {
      case ProofType.GROTH16:
        if (!this.groth16Prover) return false;
        return this.groth16Prover.verifyProof(
          proof.proof as Groth16Proof,
          proof.publicSignals ?? []
        );
        
      case ProofType.BULLETPROOFS:
        if (!this.bulletproofsProver) return false;
        const bpProof = proof.proof as BulletproofsRangeProof;
        return this.bulletproofsProver.verifyRangeProof(bpProof, bpProof.A);
        
      case ProofType.HYBRID:
        if (!this.hybridProver) return false;
        return this.hybridProver.verifyHybridProof(proof.proof as HybridProof);
        
      default:
        throw new Error(`Unsupported proof type: ${proofType}`);
    }
  }

  /**
   * Export proof for on-chain verification
   */
  async exportForOnChain(proof: GeneratedProof): Promise<{
    proofBytes: Uint8Array;
    publicInputs: bigint[];
    proofHash: string;
  }> {
    const encoder = new TextEncoder();
    const proofBytes = encoder.encode(JSON.stringify(proof.proof));
    
    return {
      proofBytes,
      publicInputs: proof.publicSignals ?? [],
      proofHash: proof.proofHash ?? '',
    };
  }

  /**
   * Get proof statistics
   */
  getProofStats(): {
    cachedProofs: number;
    generatedProofs: number;
    averageTimeMs: number;
  } {
    const cached = this.proofCache.size;
    const times = Array.from(this.proofCache.values()).map(
      (r) => r.proof.generationTimeMs
    );
    
    return {
      cachedProofs: cached,
      generatedProofs: cached,
      averageTimeMs: times.length > 0
        ? times.reduce((a, b) => a + b, 0) / times.length
        : 0,
    };
  }

  /**
   * Clear proof cache
   */
  clearCache(): void {
    this.proofCache.clear();
  }

  /**
   * Close all provers and clean up
   */
  async close(): Promise<void> {
    await this.inferenceEngine.close();
    this.proofCache.clear();
    this.ezklProvers.clear();
    this.initialized = false;
  }
}

/**
 * Create a proof generator with default configuration
 */
export function createDefaultProofGenerator(): ProofGenerator {
  return new ProofGenerator({
    defaultProofType: ProofType.GROTH16,
    bulletproofs: {
      bitSize: 64,
    },
    enableCaching: true,
  });
}

/**
 * Quick proof generation helper
 */
export async function generateQuickProof(
  modelPath: string,
  inputData: Float32Array,
  inputShape: number[],
  proofType: ProofType = ProofType.GROTH16
): Promise<GeneratedProof> {
  const generator = createDefaultProofGenerator();
  
  try {
    await generator.initialize();
    const result = await generator.generateProof({
      modelId: 'default-model',
      inputs: Array.from(inputData),
      outputs: [], // Not used for generation
      modelHash: '',
      timestamp: Date.now(),
      proofType,
      modelPath,
      inputData,
      inputShape,
    });
    return result.proof;
  } finally {
    await generator.close();
  }
}
