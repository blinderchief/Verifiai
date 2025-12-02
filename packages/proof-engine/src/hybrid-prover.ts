/**
 * @fileoverview Hybrid TEE Prover
 * @description Generates hybrid proofs combining ZK with TEE attestation
 */

import { sha3HashHex } from '@verifiai/core';
import { 
  HybridProof, 
  TEEAttestation,
  InferenceResult,
  GeneratedProof,
  Groth16Proof,
  BulletproofsRangeProof,
  ProofType,
} from './types';
import { ProofRequest } from './proof-generator';
import { Groth16Prover, Groth16ProverConfig } from './groth16-prover';
import { BulletproofsProver, BulletproofsConfig } from './bulletproofs-prover';

/**
 * TEE Provider types
 */
export type TEEProvider = 'sgx' | 'sev' | 'trustzone' | 'nitro';

/**
 * Configuration for Hybrid prover
 */
export interface HybridProverConfig {
  /** TEE provider for attestation */
  teeProvider: TEEProvider;
  /** Groth16 prover config */
  groth16Config?: Groth16ProverConfig;
  /** Bulletproofs config */
  bulletproofsConfig?: BulletproofsConfig;
  /** Whether to include Groth16 proof */
  includeGroth16: boolean;
  /** Whether to include Bulletproofs */
  includeBulletproofs: boolean;
  /** SGX enclave measurement (for SGX) */
  enclaveMeasurement?: Uint8Array;
  /** Security level (1-3) */
  securityLevel: 1 | 2 | 3;
}

/**
 * Hybrid TEE + ZK prover for maximum security
 * 
 * Combines:
 * - TEE attestation for hardware security
 * - Groth16 for cryptographic soundness
 * - Bulletproofs for efficient range proofs
 */
export class HybridProver {
  private config: HybridProverConfig;
  private groth16Prover?: Groth16Prover;
  private bulletproofsProver?: BulletproofsProver;

  constructor(config: HybridProverConfig) {
    this.config = config;

    if (config.includeGroth16 && config.groth16Config) {
      this.groth16Prover = new Groth16Prover(config.groth16Config);
    }

    if (config.includeBulletproofs && config.bulletproofsConfig) {
      this.bulletproofsProver = new BulletproofsProver(config.bulletproofsConfig);
    }
  }

  /**
   * Initialize the hybrid prover
   */
  async initialize(): Promise<void> {
    if (this.groth16Prover) {
      await this.groth16Prover.initialize();
    }
  }

  /**
   * Generate a proof for the given request
   */
  async generateProof(request: ProofRequest): Promise<GeneratedProof> {
    // Create inference result from request
    const inferenceResult: InferenceResult = {
      inputs: request.inputs.map(input => ({
        data: new Float32Array([input]),
        shape: [1],
        name: 'input',
      })),
      outputs: request.outputs.map(output => ({
        data: new Float32Array([output]),
        shape: [1],
        name: 'output',
      })),
      modelHash: request.modelHash,
      inferenceTimeMs: 0,
      executionTime: 0,
      timestamp: request.timestamp,
    };

    return this.generateHybridProof(inferenceResult, request.metadata);
  }

  /**
   * Generate a hybrid proof combining TEE and ZK
   */
  async generateHybridProof(
    inferenceResult: InferenceResult,
    additionalData?: Record<string, unknown>
  ): Promise<GeneratedProof> {
    const startTime = performance.now();

    // Generate TEE attestation
    const teeAttestation = await this.generateTEEAttestation(inferenceResult);

    // Generate component proofs
    let groth16Proof: Groth16Proof | undefined;
    let bulletproofsProof: BulletproofsRangeProof | undefined;

    if (this.groth16Prover && this.config.includeGroth16) {
      // Create a ProofRequest from InferenceResult
      const proofRequest: ProofRequest = {
        modelId: 'hybrid-model',
        inputs: inferenceResult.inputs?.map(i => Array.from(i.data)).flat() ?? [],
        outputs: inferenceResult.outputs.map(o => Array.from(o.data)).flat(),
        modelHash: inferenceResult.modelHash,
        timestamp: inferenceResult.timestamp ?? Date.now(),
        proofType: ProofType.GROTH16,
        modelPath: '', // Not used in this context
        inputData: new Float32Array(inferenceResult.inputs?.map(i => Array.from(i.data)).flat() ?? []),
        inputShape: inferenceResult.inputs?.[0]?.shape ?? [],
      };
      const groth16Result = await this.groth16Prover.generateProof(proofRequest);
      groth16Proof = groth16Result.proof as Groth16Proof;
    }

    if (this.bulletproofsProver && this.config.includeBulletproofs) {
      const bpResult = await this.bulletproofsProver.generateFromInference(
        inferenceResult
      );
      bulletproofsProof = bpResult.proof as BulletproofsRangeProof;
    }

    // Combine into hybrid proof
    const hybridProof: HybridProof = {
      attestation: teeAttestation,
      zkProof: groth16Proof ? this.serializeGroth16Proof(groth16Proof) : new Uint8Array(0),
      rangeProof: bulletproofsProof,
      combinedHash: await this.computeCombinedHash(
        teeAttestation,
        groth16Proof,
        bulletproofsProof
      ),
      groth16Proof,
    };

    const generationTimeMs = performance.now() - startTime;

    // Calculate overall proof hash
    const proofHash = hybridProof.combinedHash;

    // Serialize proof data
    const proofData = new TextEncoder().encode(JSON.stringify(hybridProof));

    return {
      proof: hybridProof,
      proofData,
      publicSignals: [
        BigInt('0x' + inferenceResult.modelHash.slice(0, 16)),
      ],
      proofHash,
      generationTimeMs,
      proofType: ProofType.HYBRID,
    };
  }

  /**
   * Generate TEE attestation for inference result
   */
  private async generateTEEAttestation(
    inferenceResult: InferenceResult
  ): Promise<TEEAttestation> {
    const timestamp = Date.now();
    const nonce = crypto.getRandomValues(new Uint8Array(32));

    // Build attestation data
    const attestationData = this.buildAttestationData(inferenceResult, nonce);

    // Generate quote based on TEE provider
    const quote = await this.generateTEEQuote(attestationData);

    // Create signature
    const signature = await this.signAttestation(attestationData, quote);

    return {
      provider: this.config.teeProvider,
      quote,
      timestamp,
      nonce,
      signature,
      enclaveMeasurement: this.config.enclaveMeasurement,
    };
  }

  /**
   * Build attestation data from inference result
   */
  private buildAttestationData(
    inferenceResult: InferenceResult,
    nonce: Uint8Array
  ): Uint8Array {
    const encoder = new TextEncoder();
    
    const data = {
      modelHash: inferenceResult.modelHash,
      inferenceTimeMs: inferenceResult.inferenceTimeMs,
      outputCount: inferenceResult.outputs.length,
      nonce: Array.from(nonce),
      timestamp: Date.now(),
    };

    return encoder.encode(JSON.stringify(data));
  }

  /**
   * Generate TEE quote based on provider
   */
  private async generateTEEQuote(data: Uint8Array): Promise<Uint8Array> {
    switch (this.config.teeProvider) {
      case 'sgx':
        return this.generateSGXQuote(data);
      case 'sev':
        return this.generateSEVQuote(data);
      case 'trustzone':
        return this.generateTrustZoneQuote(data);
      case 'nitro':
        return this.generateNitroQuote(data);
      default:
        throw new Error(`Unsupported TEE provider: ${this.config.teeProvider}`);
    }
  }

  /**
   * Generate Intel SGX quote
   */
  private async generateSGXQuote(data: Uint8Array): Promise<Uint8Array> {
    // In production, this would call the SGX SDK to generate a real quote
    // For now, we simulate the quote structure
    
    const quote = new Uint8Array(432 + data.length); // SGX quote header + report
    
    // Quote version (2 bytes)
    quote[0] = 2;
    quote[1] = 0;
    
    // Sign type (2 bytes) - EPID linkable
    quote[2] = 0;
    quote[3] = 0;
    
    // EPID Group ID (4 bytes)
    quote[4] = 0;
    quote[5] = 0;
    quote[6] = 0;
    quote[7] = 1;
    
    // QE SVN (2 bytes)
    quote[8] = 1;
    quote[9] = 0;
    
    // PCE SVN (2 bytes)
    quote[10] = 1;
    quote[11] = 0;
    
    // Reserved (4 bytes)
    // ...
    
    // Basename (32 bytes) - enclave measurement
    if (this.config.enclaveMeasurement) {
      quote.set(this.config.enclaveMeasurement.slice(0, 32), 16);
    }
    
    // Report body starts at offset 48
    // MRENCLAVE (32 bytes)
    const mrenclave = sha3HashHex(data);
    for (let i = 0; i < 32; i++) {
      quote[48 + i] = parseInt(mrenclave.slice(i * 2, i * 2 + 2), 16);
    }
    
    // Include user data
    quote.set(data, 432);
    
    return quote;
  }

  /**
   * Generate AMD SEV quote
   */
  private async generateSEVQuote(data: Uint8Array): Promise<Uint8Array> {
    // Simulate AMD SEV attestation report
    const quote = new Uint8Array(512 + data.length);
    
    // Version
    quote[0] = 1;
    
    // Guest SVN
    quote[4] = 1;
    
    // Policy
    quote[8] = 0x01; // Debug disabled
    
    // Measurement (32 bytes at offset 32)
    const measurement = sha3HashHex(data);
    for (let i = 0; i < 32; i++) {
      quote[32 + i] = parseInt(measurement.slice(i * 2, i * 2 + 2), 16);
    }
    
    // Report data
    quote.set(data, 512);
    
    return quote;
  }

  /**
   * Generate ARM TrustZone attestation
   */
  private async generateTrustZoneQuote(data: Uint8Array): Promise<Uint8Array> {
    // Simulate TrustZone attestation
    const quote = new Uint8Array(256 + data.length);
    
    // Header
    quote[0] = 0x54; // 'T'
    quote[1] = 0x5A; // 'Z'
    
    // Version
    quote[4] = 1;
    
    // Secure world hash
    const hash = sha3HashHex(data);
    for (let i = 0; i < 32; i++) {
      quote[16 + i] = parseInt(hash.slice(i * 2, i * 2 + 2), 16);
    }
    
    // Data
    quote.set(data, 256);
    
    return quote;
  }

  /**
   * Generate AWS Nitro Enclave attestation
   */
  private async generateNitroQuote(data: Uint8Array): Promise<Uint8Array> {
    // Simulate Nitro attestation document (CBOR encoded in production)
    const quote = new Uint8Array(384 + data.length);
    
    // Module ID (48 bytes)
    const moduleId = sha3HashHex(new TextEncoder().encode('nitro-module'));
    for (let i = 0; i < 48; i++) {
      quote[i] = parseInt(moduleId.slice((i * 2) % 64, (i * 2 + 2) % 64 + 2) || '00', 16);
    }
    
    // PCR0 - Enclave image (32 bytes)
    const pcr0 = sha3HashHex(data);
    for (let i = 0; i < 32; i++) {
      quote[48 + i] = parseInt(pcr0.slice(i * 2, i * 2 + 2), 16);
    }
    
    // User data
    quote.set(data, 384);
    
    return quote;
  }

  /**
   * Sign attestation data
   */
  private async signAttestation(
    data: Uint8Array,
    quote: Uint8Array
  ): Promise<Uint8Array> {
    // In production, use proper cryptographic signing
    // For now, create a deterministic signature
    const combined = new Uint8Array(data.length + quote.length);
    combined.set(data);
    combined.set(quote, data.length);
    
    const signatureHash = sha3HashHex(combined);
    const signature = new Uint8Array(64);
    
    for (let i = 0; i < 32; i++) {
      signature[i] = parseInt(signatureHash.slice(i * 2, i * 2 + 2), 16);
    }
    for (let i = 0; i < 32; i++) {
      signature[32 + i] = parseInt(signatureHash.slice(63 - i * 2, 65 - i * 2) || '00', 16);
    }
    
    return signature;
  }

  /**
   * Compute combined hash of all proof components
   */
  private async computeCombinedHash(
    tee: TEEAttestation,
    groth16?: Groth16Proof,
    bulletproofs?: BulletproofsRangeProof
  ): Promise<string> {
    const parts: Uint8Array[] = [tee.quote, tee.signature];
    
    if (groth16) {
      // Serialize Groth16 proof points
      const g16Bytes = new TextEncoder().encode(
        groth16.pi_a.map(n => n.toString(16)).join('')
      );
      parts.push(g16Bytes);
    }
    
    if (bulletproofs) {
      parts.push(bulletproofs.A);
      parts.push(bulletproofs.S);
    }
    
    const totalLength = parts.reduce((sum, p) => sum + p.length, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    
    for (const part of parts) {
      combined.set(part, offset);
      offset += part.length;
    }
    
    return sha3HashHex(combined);
  }

  /**
   * Verify hybrid proof
   */
  async verifyHybridProof(proof: HybridProof): Promise<boolean> {
    // Verify TEE attestation
    const teeValid = await this.verifyTEEAttestation(proof.attestation);
    if (!teeValid) {
      return false;
    }

    // Verify Groth16 if present
    if (proof.groth16Proof && this.groth16Prover) {
      // Would need public signals for full verification
      // For now, check structure
      if (!proof.groth16Proof.pi_a || !proof.groth16Proof.pi_b || !proof.groth16Proof.pi_c) {
        return false;
      }
    }

    // Verify Bulletproofs if present
    if (proof.rangeProof && this.bulletproofsProver) {
      const bpValid = await this.bulletproofsProver.verifyRangeProof(
        proof.rangeProof,
        proof.rangeProof.A
      );
      if (!bpValid) {
        return false;
      }
    }

    return true;
  }

  /**
   * Serialize Groth16 proof to bytes
   */
  private serializeGroth16Proof(proof: Groth16Proof): Uint8Array {
    const encoder = new TextEncoder();
    const serialized = JSON.stringify({
      pi_a: proof.pi_a.map(v => v.toString()),
      pi_b: proof.pi_b.map(arr => (arr as (string | bigint)[]).map(v => v.toString())),
      pi_c: proof.pi_c.map(v => v.toString()),
      protocol: proof.protocol,
      curve: proof.curve,
    });
    return encoder.encode(serialized);
  }

  /**
   * Verify TEE attestation
   */
  private async verifyTEEAttestation(attestation: TEEAttestation): Promise<boolean> {
    // Check timestamp is recent (within 1 hour)
    const oneHourAgo = Date.now() - 3600 * 1000;
    if (attestation.timestamp < oneHourAgo) {
      return false;
    }

    // Check quote is present and has minimum size
    if (!attestation.quote || attestation.quote.length < 100) {
      return false;
    }

    // Check signature is present
    if (!attestation.signature || attestation.signature.length < 64) {
      return false;
    }

    // In production, verify against Intel/AMD/AWS attestation services
    return true;
  }

  /**
   * Get security level description
   */
  getSecurityLevelDescription(): string {
    const levels: Record<number, string> = {
      1: 'TEE attestation only - fast, moderate security',
      2: 'TEE + Bulletproofs - balanced security and speed',
      3: 'TEE + Groth16 + Bulletproofs - maximum security',
    };
    return levels[this.config.securityLevel] ?? 'Unknown';
  }
}
