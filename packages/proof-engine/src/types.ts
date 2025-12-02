/**
 * @fileoverview Proof Engine Types
 * @description Type definitions specific to proof generation
 */

import { ProofType, Groth16VerificationKey, BulletproofsParams } from '@verifiai/core';

// Re-export ProofType for convenience
export { ProofType };

/**
 * ONNX model configuration
 */
export interface ONNXModelConfig {
  /** Path to the ONNX model file */
  modelPath: string;
  /** Model input shape */
  inputShape: number[];
  /** Model output shapes (multiple supported) */
  inputShapes?: number[][];
  /** Model output shape */
  outputShape: number[];
  /** Input names */
  inputNames: string[];
  /** Output names */
  outputNames: string[];
}

/**
 * Inference input data
 */
export interface InferenceInput {
  /** Input tensor data */
  data: Float32Array | Float64Array;
  /** Input shape */
  shape: number[];
  /** Input name */
  name: string;
}

/**
 * Inference output data
 */
export interface InferenceOutput {
  /** Output tensor data */
  data: Float32Array | Float64Array;
  /** Output shape */
  shape: number[];
  /** Output name */
  name: string;
}

/**
 * Inference result with timing
 */
export interface InferenceResult {
  /** Input data */
  inputs?: InferenceInput[];
  /** Output data */
  outputs: InferenceOutput[];
  /** Inference time in milliseconds */
  inferenceTimeMs: number;
  /** Model hash */
  modelHash: string;
  /** Execution time */
  executionTime?: number;
  /** Timestamp */
  timestamp?: number;
}

/**
 * Groth16 proof components
 */
export interface Groth16Proof {
  /** Pi_a point */
  pi_a: [string | bigint, string | bigint] | [string, string, string];
  /** Pi_b point (nested) */
  pi_b: [[string | bigint, string | bigint], [string | bigint, string | bigint]] | [[string, string], [string, string], [string, string]];
  /** Pi_c point */
  pi_c: [string | bigint, string | bigint] | [string, string, string];
  /** Protocol type */
  protocol: 'groth16';
  /** Curve type */
  curve: 'bn128' | 'bls12381';
}

/**
 * Bulletproofs range proof
 */
export interface BulletproofsRangeProof {
  /** Proof commitments */
  A: Uint8Array;
  S: Uint8Array;
  T1: Uint8Array;
  T2: Uint8Array;
  /** Proof scalars */
  taux: Uint8Array;
  mu: Uint8Array;
  /** Inner product proof vectors */
  L: Uint8Array[];
  R: Uint8Array[];
  /** Final scalars */
  a: Uint8Array;
  b: Uint8Array;
  t: Uint8Array;
  /** Inner product proof (alternative structure) */
  innerProduct?: {
    L: Uint8Array[];
    R: Uint8Array[];
    a: Uint8Array;
    b: Uint8Array;
  };
}

/**
 * TEE Attestation data
 */
export interface TEEAttestation {
  /** TEE provider type */
  provider?: 'sgx' | 'sev' | 'trustzone' | 'nitro';
  /** Enclave measurement */
  mrenclave?: Uint8Array;
  /** Signer measurement */
  mrsigner?: Uint8Array;
  /** Report data */
  reportData?: Uint8Array;
  /** Raw quote from TEE */
  quote: Uint8Array;
  /** Signature */
  signature: Uint8Array;
  /** Timestamp */
  timestamp: number;
  /** Nonce for freshness */
  nonce?: Uint8Array;
  /** Enclave measurement (alternative) */
  enclaveMeasurement?: Uint8Array;
}

/**
 * Hybrid proof with TEE attestation
 */
export interface HybridProof {
  /** ZK proof component */
  zkProof: Uint8Array;
  /** TEE attestation */
  attestation: TEEAttestation;
  /** Optional range proof */
  rangeProof?: BulletproofsRangeProof;
  /** Combined hash of all components */
  combinedHash?: string;
  /** Groth16 proof if included */
  groth16Proof?: Groth16Proof;
}

/**
 * Proof generation request
 */
export interface ProofGenerationRequest {
  /** Proof type to generate */
  proofType: ProofType;
  /** Inference inputs */
  inputs: InferenceInput[];
  /** ONNX model config */
  modelConfig: ONNXModelConfig;
  /** Optional verification key (for Groth16) */
  verificationKey?: Groth16VerificationKey;
  /** Optional parameters (for Bulletproofs) */
  params?: BulletproofsParams;
}

/**
 * Generated proof result
 */
export interface GeneratedProof {
  /** Unique proof ID */
  proofId?: string;
  /** Proof type */
  proofType: ProofType;
  /** Serialized proof data */
  proofData?: Uint8Array;
  /** Public inputs used */
  publicInputs?: Uint8Array[];
  /** Model hash */
  modelHash?: string;
  /** Output hash */
  outputHash?: string;
  /** Inference result */
  inferenceResult?: InferenceResult;
  /** Generation time in milliseconds */
  generationTimeMs: number;
  /** Estimated verification gas */
  estimatedGas?: bigint;
  /** Actual proof object (Groth16, Bulletproofs, etc.) */
  proof?: Groth16Proof | BulletproofsRangeProof | HybridProof;
  /** Public signals (alternative format) */
  publicSignals?: bigint[];
  /** Proof hash */
  proofHash?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Circuit configuration for ZKML
 */
export interface CircuitConfig {
  /** Number of constraints */
  numConstraints: number;
  /** Number of public inputs */
  numPublicInputs: number;
  /** Number of private inputs */
  numPrivateInputs: number;
  /** Proving key path */
  provingKeyPath?: string;
  /** Verification key path */
  verificationKeyPath?: string;
  /** Circuit path (for zkSNARKs) */
  circuitPath?: string;
}

/**
 * EZKL configuration
 */
export interface EZKLConfig {
  /** Path to compiled circuit */
  compiledCircuitPath?: string;
  /** Path to SRS (Structured Reference String) */
  srsPath?: string;
  /** Proof system to use */
  proofSystem: 'groth16' | 'plonk' | 'fflonk';
  /** Bits of precision for fixed-point */
  scaleBits: number;
  /** Lookup bits for table lookups */
  lookupBits: number;
  /** Log rows for circuit sizing */
  logRows: number;
  /** Working directory for EZKL files */
  workingDir: string;
  /** Path to ONNX model */
  modelPath: string;
  /** Input shape for the model */
  inputShape: number[];
}

/**
 * Proof verification result
 */
export interface VerificationResult {
  /** Whether proof is valid */
  isValid: boolean;
  /** Verification time in milliseconds */
  verificationTimeMs: number;
  /** Error message if invalid */
  errorMessage?: string;
  /** Verified public inputs */
  verifiedInputs?: Uint8Array[];
}
