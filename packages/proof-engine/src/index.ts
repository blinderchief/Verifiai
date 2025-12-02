/**
 * @fileoverview Proof Engine Package Exports
 * @description Main entry point for @verifiai/proof-engine
 */

// Types - export type only
export type {
  InferenceInput,
  InferenceOutput,
  InferenceResult,
  GeneratedProof,
  VerificationResult,
  EZKLConfig,
  ONNXModelConfig,
  ProofGenerationRequest,
  CircuitConfig,
  Groth16Proof,
  BulletproofsRangeProof,
  HybridProof,
} from './types';

// Re-export core types that are used in proof engine
export type {
  ProofType,
  ProofStatus,
  Groth16VerificationKey,
  BulletproofsParams,
} from '@verifiai/core';

// ONNX Inference
export {
  ONNXInferenceEngine,
  preprocessImageForVision,
  preprocessTextForNLP,
  createInputTensor,
} from './inference';

// Groth16 Prover
export {
  Groth16Prover,
} from './groth16-prover';
export type { Groth16ProverConfig } from './groth16-prover';

// Bulletproofs Prover
export {
  BulletproofsProver,
} from './bulletproofs-prover';
export type { BulletproofsConfig, PedersenCommitment } from './bulletproofs-prover';

// Hybrid Prover
export {
  HybridProver,
} from './hybrid-prover';
export type { HybridProverConfig, TEEProvider } from './hybrid-prover';

// EZKL Prover
export {
  EZKLProver,
} from './ezkl-prover';
export type { CalibrationSettings, CircuitSettings } from './ezkl-prover';

// Main Proof Generator
export {
  ProofGenerator,
  createDefaultProofGenerator,
  generateQuickProof,
} from './proof-generator';
export type { ProofGeneratorConfig, ProofRequest, ProofResult } from './proof-generator';
