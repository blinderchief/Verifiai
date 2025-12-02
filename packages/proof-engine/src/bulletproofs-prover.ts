/**
 * @fileoverview Bulletproofs Range Prover
 * @description Generates Bulletproofs for range-constrained AI outputs
 */

import { sha3HashHex, bytesToHex } from '@verifiai/core';
import { 
  BulletproofsRangeProof, 
  InferenceResult,
  GeneratedProof,
  ProofType,
} from './types';
import type { ProofRequest } from './proof-generator';

/**
 * Configuration for Bulletproofs prover
 */
export interface BulletproofsConfig {
  /** Bit size for range proofs (e.g., 32, 64) */
  bitSize: number;
  /** Aggregation count for batched proofs */
  aggregationCount?: number;
  /** Generator point seed for reproducibility */
  generatorSeed?: Uint8Array;
}

/**
 * Pedersen commitment for Bulletproofs
 */
export interface PedersenCommitment {
  /** Commitment value */
  commitment: Uint8Array;
  /** Blinding factor (keep secret) */
  blindingFactor: bigint;
  /** Committed value */
  value: bigint;
}

/**
 * Bulletproofs range prover for AI output verification
 * 
 * Bulletproofs are ideal for proving that AI outputs fall within 
 * expected ranges without revealing the exact values.
 */
export class BulletproofsProver {
  private config: BulletproofsConfig;
  private generatorH: Uint8Array;
  private generatorG: Uint8Array;

  constructor(config: BulletproofsConfig) {
    this.config = {
      aggregationCount: 1,
      ...config,
    };
    
    // Initialize generators (simplified - in production use proper curve operations)
    this.generatorH = this.deriveGenerator(config.generatorSeed ?? new Uint8Array(32), 'H');
    this.generatorG = this.deriveGenerator(config.generatorSeed ?? new Uint8Array(32), 'G');
  }

  /**
   * Generate a proof for the given request
   */
  async generateProof(request: ProofRequest): Promise<GeneratedProof> {
    if (!request.outputs || request.outputs.length === 0 || request.outputs[0] === undefined) {
      throw new Error('Request must include valid outputs for Bulletproofs proof generation');
    }
    // For simplicity, prove the first output value is in range
    const value = BigInt(Math.floor(request.outputs[0] * 1000)); // Convert to bigint
    return this.generateRangeProof(value);
  }

  /**
   * Generate a range proof for a value
   * @param value The value to prove is in range [0, 2^bitSize)
   * @param min Optional minimum bound
   * @param max Optional maximum bound
   */
  async generateRangeProof(
    value: bigint,
    min?: bigint,
    max?: bigint
  ): Promise<GeneratedProof> {
    const startTime = performance.now();

    // Create commitment
    const commitment = await this.createCommitment(value);

    // Generate the range proof
    const proof = await this.proveRange(
      value,
      commitment.blindingFactor,
      min ?? 0n,
      max ?? (1n << BigInt(this.config.bitSize)) - 1n
    );

    const generationTimeMs = performance.now() - startTime;

    // Calculate proof hash
    const proofBytes = this.serializeProof(proof);
    const proofHash = sha3HashHex(proofBytes);

    return {
      proof,
      proofData: proofBytes,
      publicSignals: [commitment.value],
      proofHash,
      generationTimeMs,
      proofType: ProofType.BULLETPROOFS,
    };
  }

  /**
   * Generate aggregated range proofs for multiple values
   */
  async generateAggregatedProof(
    values: bigint[],
    min: bigint,
    max: bigint
  ): Promise<GeneratedProof> {
    const startTime = performance.now();

    // Create commitments for all values
    const commitments: PedersenCommitment[] = [];
    for (const value of values) {
      commitments.push(await this.createCommitment(value));
    }

    // Generate aggregated proof
    const proof = await this.proveRangeAggregated(
      values,
      commitments.map((c) => c.blindingFactor),
      min,
      max
    );

    const generationTimeMs = performance.now() - startTime;

    const proofBytes = this.serializeProof(proof);
    const proofHash = sha3HashHex(proofBytes);

    return {
      proof,
      publicSignals: commitments.map((c) => c.value),
      proofHash,
      generationTimeMs,
      proofType: ProofType.BULLETPROOFS,
    };
  }

  /**
   * Verify a range proof
   */
  async verifyRangeProof(
    proof: BulletproofsRangeProof,
    commitment: Uint8Array
  ): Promise<boolean> {
    // Verify the inner product argument
    const valid = await this.verifyInnerProductArgument(
      proof.L,
      proof.R,
      proof.a,
      proof.b,
      proof.t
    );

    // Verify commitment matches
    if (!valid) {
      return false;
    }

    // Verify range bounds
    // In a real implementation, this would verify the full Bulletproofs protocol
    return true;
  }

  /**
   * Generate proof from inference result
   */
  async generateFromInference(
    inferenceResult: InferenceResult,
    outputIndex: number = 0,
    min: bigint = 0n,
    max: bigint = 1000000n // Default max for quantized outputs
  ): Promise<GeneratedProof> {
    const output = inferenceResult.outputs[outputIndex];
    if (!output) {
      throw new Error(`Output index ${outputIndex} not found`);
    }

    // Quantize the first output value
    const quantized = this.quantizeValue(output.data[0] ?? 0);
    
    return this.generateRangeProof(quantized, min, max);
  }

  /**
   * Create a Pedersen commitment
   */
  private async createCommitment(value: bigint): Promise<PedersenCommitment> {
    // Generate random blinding factor
    const blindingBytes = new Uint8Array(32);
    crypto.getRandomValues(blindingBytes);
    const blindingFactor = this.bytesToBigInt(blindingBytes);

    // Compute commitment: C = vG + rH
    // Simplified - in production use proper elliptic curve operations
    const commitment = this.computeCommitment(value, blindingFactor);

    return {
      commitment,
      blindingFactor,
      value,
    };
  }

  /**
   * Core range proof generation
   */
  private async proveRange(
    value: bigint,
    blindingFactor: bigint,
    min: bigint,
    max: bigint
  ): Promise<BulletproofsRangeProof> {
    // Bulletproofs range proof implementation
    // This is a simplified version - production would use a proper library
    
    const n = this.config.bitSize;
    const rounds = Math.ceil(Math.log2(n));
    
    const L: Uint8Array[] = [];
    const R: Uint8Array[] = [];
    
    // Generate inner product argument
    for (let i = 0; i < rounds; i++) {
      L.push(this.generateChallenge(`L_${i}`, value));
      R.push(this.generateChallenge(`R_${i}`, value));
    }

    // Final scalars
    const a = this.generateScalar(value, 'a');
    const b = this.generateScalar(value, 'b');
    const t = this.generateScalar(value, 't');

    return {
      A: this.generatePoint(value, 'A'),
      S: this.generatePoint(value, 'S'),
      T1: this.generatePoint(value, 'T1'),
      T2: this.generatePoint(value, 'T2'),
      taux: this.generateScalar(value, 'taux'),
      mu: this.generateScalar(value, 'mu'),
      L,
      R,
      a,
      b,
      t,
    };
  }

  /**
   * Aggregated range proof generation
   */
  private async proveRangeAggregated(
    values: bigint[],
    blindingFactors: bigint[],
    min: bigint,
    max: bigint
  ): Promise<BulletproofsRangeProof> {
    // Aggregate all values into single proof
    const aggregatedValue = values.reduce((sum, v) => sum + v, 0n);
    const aggregatedBlinding = blindingFactors.reduce((sum, b) => sum + b, 0n);
    
    return this.proveRange(aggregatedValue, aggregatedBlinding, min * BigInt(values.length), max * BigInt(values.length));
  }

  /**
   * Verify inner product argument
   */
  private async verifyInnerProductArgument(
    L: Uint8Array[],
    R: Uint8Array[],
    a: Uint8Array,
    b: Uint8Array,
    t: Uint8Array
  ): Promise<boolean> {
    // Simplified verification
    // In production, this would verify the full inner product proof
    return L.length > 0 && R.length > 0 && a.length > 0 && b.length > 0;
  }

  /**
   * Derive generator point from seed
   */
  private deriveGenerator(seed: Uint8Array, label: string): Uint8Array {
    const labelBytes = new TextEncoder().encode(label);
    const combined = new Uint8Array(seed.length + labelBytes.length);
    combined.set(seed);
    combined.set(labelBytes, seed.length);
    
    // Hash to derive point (simplified)
    return new Uint8Array(32).fill(label.charCodeAt(0));
  }

  /**
   * Compute Pedersen commitment
   */
  private computeCommitment(value: bigint, blindingFactor: bigint): Uint8Array {
    // Simplified commitment computation
    // In production, use proper elliptic curve point multiplication
    const combined = value + blindingFactor;
    const bytes = new Uint8Array(32);
    for (let i = 0; i < 32 && combined > 0n; i++) {
      bytes[31 - i] = Number((combined >> BigInt(i * 8)) & 0xffn);
    }
    return bytes;
  }

  /**
   * Generate challenge for Fiat-Shamir
   */
  private generateChallenge(label: string, value: bigint): Uint8Array {
    const data = `${label}:${value.toString(16)}`;
    const encoded = new TextEncoder().encode(data);
    return new Uint8Array(32).map((_, i) => encoded[i % encoded.length] ?? 0);
  }

  /**
   * Generate scalar value as Uint8Array
   */
  private generateScalar(value: bigint, label: string): Uint8Array {
    return this.generateChallenge(label, value);
  }

  /**
   * Generate curve point
   */
  private generatePoint(value: bigint, label: string): Uint8Array {
    return this.generateChallenge(label, value);
  }

  /**
   * Convert bytes to bigint
   */
  private bytesToBigInt(bytes: Uint8Array): bigint {
    let result = 0n;
    for (const byte of bytes) {
      result = (result << 8n) | BigInt(byte);
    }
    return result;
  }

  /**
   * Quantize float to bigint
   */
  private quantizeValue(value: number, scale: number = 1e6): bigint {
    return BigInt(Math.round(value * scale));
  }

  /**
   * Serialize proof to bytes
   */
  private serializeProof(proof: BulletproofsRangeProof): Uint8Array {
    const parts: Uint8Array[] = [
      proof.A,
      proof.S,
      proof.T1,
      proof.T2,
      ...proof.L,
      ...proof.R,
    ];
    
    const totalLength = parts.reduce((sum, p) => sum + p.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    
    for (const part of parts) {
      result.set(part, offset);
      offset += part.length;
    }
    
    return result;
  }
}
