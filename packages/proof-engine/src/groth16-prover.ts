/**
 * @fileoverview Groth16 zkSNARK Prover
 * @description Generates Groth16 proofs for AI inference verification
 */

import * as snarkjs from 'snarkjs';
import * as fs from 'fs/promises';
import * as path from 'path';
import { sha3HashHex, bytesToHex } from '@verifiai/core';
import { 
  Groth16Proof, 
  CircuitConfig, 
  InferenceResult,
  GeneratedProof,
  ProofType,
} from './types';
import { ONNXInferenceEngine } from './inference';
import type { ProofRequest } from './proof-generator';

/**
 * Configuration for Groth16 prover
 */
export interface Groth16ProverConfig {
  circuitsPath: string;
  provingKeyPath: string;
  verificationKeyPath?: string;
}

/**
 * Groth16 zkSNARK prover for AI inference proofs
 */
export class Groth16Prover {
  private config: Groth16ProverConfig;
  private verificationKey: any = null;
  private inferenceEngine: ONNXInferenceEngine;

  constructor(config: Groth16ProverConfig) {
    this.config = config;
    this.inferenceEngine = new ONNXInferenceEngine();
  }

  /**
   * Initialize the prover by loading verification key
   */
  async initialize(): Promise<void> {
    if (this.config.verificationKeyPath) {
      const vkeyData = await fs.readFile(this.config.verificationKeyPath, 'utf-8');
      this.verificationKey = JSON.parse(vkeyData);
    }
  }

  /**
   * Generate a Groth16 proof for inference result
   * @param request The proof request with model and input data
   * @returns Generated proof
   */
  async generateProof(request: ProofRequest): Promise<GeneratedProof> {
    // Load model if not loaded
    if (!this.inferenceEngine.isLoaded()) {
      await this.inferenceEngine.loadModel({
        modelPath: this.config.circuitsPath + '/model.onnx', // Use a default model path
        inputShape: [1, request.inputs.length],
        inputNames: ['input'],
        outputNames: ['output'],
        outputShape: [1, request.outputs.length],
      });
    }

    // Run inference
    const inferenceResult = await this.inferenceEngine.runInference([
      {
        data: new Float32Array(request.inputs),
        shape: [1, request.inputs.length],
        name: 'input',
      },
    ]);

    const startTime = performance.now();

    // Prepare inputs with inference data
    const inputs = this.prepareCircuitInputs(inferenceResult, {});

    // Generate the proof
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      inputs,
      this.config.circuitsPath + '/circuit.wasm',
      this.config.provingKeyPath
    );

    const generationTimeMs = performance.now() - startTime;

    // Convert to our proof format
    const groth16Proof = this.convertToProofFormat(proof);

    // Calculate proof hash
    const proofBytes = this.serializeProof(groth16Proof);
    const proofHash = sha3HashHex(proofBytes);

    return {
      proof: groth16Proof,
      proofData: proofBytes,
      publicSignals: publicSignals.map((s: string) => BigInt(s)),
      proofHash,
      generationTimeMs,
      proofType: ProofType.GROTH16,
      metadata: {
        modelId: request.modelId,
        timestamp: request.timestamp,
      },
    };
  }

  /**
   * Verify a Groth16 proof locally
   */
  async verifyProof(
    proof: Groth16Proof,
    publicSignals: bigint[]
  ): Promise<boolean> {
    if (!this.verificationKey) {
      throw new Error('Verification key not loaded. Call initialize() first.');
    }

    const snarkjsProof = this.convertFromProofFormat(proof);
    const signals = publicSignals.map((s) => s.toString());

    return snarkjs.groth16.verify(
      this.verificationKey,
      signals,
      snarkjsProof
    );
  }

  /**
   * Export proof for on-chain verification
   */
  async exportCalldata(
    proof: Groth16Proof,
    publicSignals: bigint[]
  ): Promise<{
    a: [bigint, bigint];
    b: [[bigint, bigint], [bigint, bigint]];
    c: [bigint, bigint];
    input: bigint[];
  }> {
    const snarkjsProof = this.convertFromProofFormat(proof);
    const signals = publicSignals.map((s) => s.toString());

    const calldata = await snarkjs.groth16.exportSolidityCallData(
      snarkjsProof,
      signals
    );

    // Parse the calldata
    const [a, b, c, input] = JSON.parse(`[${calldata}]`);

    return {
      a: a.map(BigInt) as [bigint, bigint],
      b: b.map((row: string[]) => row.map(BigInt)) as [[bigint, bigint], [bigint, bigint]],
      c: c.map(BigInt) as [bigint, bigint],
      input: input.map(BigInt),
    };
  }

  /**
   * Prepare circuit inputs from inference result
   */
  private prepareCircuitInputs(
    inferenceResult: InferenceResult,
    additionalInputs: Record<string, bigint | bigint[]>
  ): Record<string, string | string[]> {
    const inputs: Record<string, string | string[]> = {};

    // Add model hash as input
    inputs['modelHash'] = BigInt('0x' + inferenceResult.modelHash.slice(0, 16)).toString();

    // Quantize inference outputs for circuit
    for (const output of inferenceResult.outputs) {
      const quantized = this.quantizeForCircuit(output.data);
      inputs[output.name] = quantized.map((v) => v.toString());
    }

    // Add additional inputs
    for (const [key, value] of Object.entries(additionalInputs)) {
      if (Array.isArray(value)) {
        inputs[key] = value.map((v) => v.toString());
      } else {
        inputs[key] = value.toString();
      }
    }

    return inputs;
  }

  /**
   * Quantize floating point values for circuit
   */
  private quantizeForCircuit(
    data: Float32Array | Float64Array,
    scale: number = 1e6
  ): bigint[] {
    const quantized: bigint[] = [];
    for (let i = 0; i < data.length; i++) {
      const val = data[i];
      if (val !== undefined) {
        const scaled = Math.round(val * scale);
        quantized.push(BigInt(scaled));
      }
    }
    return quantized;
  }

  /**
   * Convert snarkjs proof to our format
   */
  private convertToProofFormat(snarkjsProof: any): Groth16Proof {
    return {
      pi_a: [BigInt(snarkjsProof.pi_a[0]), BigInt(snarkjsProof.pi_a[1])],
      pi_b: [
        [BigInt(snarkjsProof.pi_b[0][0]), BigInt(snarkjsProof.pi_b[0][1])],
        [BigInt(snarkjsProof.pi_b[1][0]), BigInt(snarkjsProof.pi_b[1][1])],
      ],
      pi_c: [BigInt(snarkjsProof.pi_c[0]), BigInt(snarkjsProof.pi_c[1])],
      protocol: 'groth16',
      curve: 'bn128',
    };
  }

  /**
   * Convert our proof format to snarkjs format
   */
  private convertFromProofFormat(proof: Groth16Proof): any {
    return {
      pi_a: [proof.pi_a[0].toString(), proof.pi_a[1].toString(), '1'],
      pi_b: [
        [proof.pi_b[0][0].toString(), proof.pi_b[0][1].toString()],
        [proof.pi_b[1][0].toString(), proof.pi_b[1][1].toString()],
        ['1', '0'],
      ],
      pi_c: [proof.pi_c[0].toString(), proof.pi_c[1].toString(), '1'],
      protocol: 'groth16',
      curve: 'bn128',
    };
  }

  /**
   * Serialize proof to bytes
   */
  private serializeProof(proof: Groth16Proof): Uint8Array {
    const parts: string[] = [
      proof.pi_a[0].toString(16).padStart(64, '0'),
      proof.pi_a[1].toString(16).padStart(64, '0'),
      proof.pi_b[0][0].toString(16).padStart(64, '0'),
      proof.pi_b[0][1].toString(16).padStart(64, '0'),
      proof.pi_b[1][0].toString(16).padStart(64, '0'),
      proof.pi_b[1][1].toString(16).padStart(64, '0'),
      proof.pi_c[0].toString(16).padStart(64, '0'),
      proof.pi_c[1].toString(16).padStart(64, '0'),
    ];

    const hexString = parts.join('');
    const bytes = new Uint8Array(hexString.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hexString.slice(i * 2, i * 2 + 2), 16);
    }

    return bytes;
  }
}

/**
 * Compile a circuit from Circom source
 * Note: Requires circom to be installed
 */
export async function compileCircuit(
  circomPath: string,
  outputDir: string
): Promise<CircuitConfig> {
  const circuitName = path.basename(circomPath, '.circom');
  
  return {
    circuitPath: circomPath,
    provingKeyPath: path.join(outputDir, `${circuitName}.zkey`),
    verificationKeyPath: path.join(outputDir, `${circuitName}_vkey.json`),
    numConstraints: 0, // Would be set after compilation
    numPublicInputs: 0,
    numPrivateInputs: 0,
  };
}
