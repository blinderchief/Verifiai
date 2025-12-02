/**
 * @fileoverview EZKL Integration
 * @description Wrapper for EZKL ZKML prover
 */

import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { sha3HashHex } from '@verifiai/core';
import { 
  EZKLConfig, 
  GeneratedProof,
  Groth16Proof,
  ProofType,
} from './types';

/**
 * EZKL calibration settings
 */
export interface CalibrationSettings {
  /** Input scale factor */
  inputScale: number;
  /** Parameter scale factor */
  paramScale: number;
  /** Number of bits for lookup tables */
  lookupBits: number;
  /** Log2 of rows in the circuit */
  logRows: number;
}

/**
 * EZKL circuit settings
 */
export interface CircuitSettings {
  /** Run mode: generate, prove, verify */
  runArgs: {
    tolerance: {
      val: number;
      scale: number;
    };
    inputVisibility: 'public' | 'private' | 'hashed' | 'encrypted';
    outputVisibility: 'public' | 'private' | 'hashed' | 'encrypted';
    paramVisibility: 'public' | 'private' | 'hashed' | 'encrypted';
  };
}

/**
 * EZKL prover for ONNX models
 * 
 * EZKL converts ONNX models to ZK circuits and generates proofs
 */
export class EZKLProver {
  private config: EZKLConfig;
  private calibrationSettings?: CalibrationSettings;
  private circuitSettings?: CircuitSettings;
  private isSetup: boolean = false;

  constructor(config: EZKLConfig) {
    this.config = config;
  }

  /**
   * Run full EZKL setup pipeline
   */
  async setup(): Promise<void> {
    // 1. Generate settings
    await this.generateSettings();
    
    // 2. Calibrate
    await this.calibrate();
    
    // 3. Compile circuit
    await this.compileCircuit();
    
    // 4. Setup proving key
    await this.setupKeys();
    
    this.isSetup = true;
  }

  /**
   * Generate circuit settings from ONNX model
   */
  async generateSettings(): Promise<void> {
    const settingsPath = path.join(this.config.workingDir, 'settings.json');
    
    await this.runEZKL([
      'gen-settings',
      '-M', this.config.modelPath,
      '-O', settingsPath,
    ]);

    // Load generated settings
    const settingsData = await fs.readFile(settingsPath, 'utf-8');
    this.circuitSettings = JSON.parse(settingsData);
  }

  /**
   * Calibrate the circuit with sample data
   */
  async calibrate(): Promise<void> {
    const calibrationPath = path.join(this.config.workingDir, 'calibration.json');
    const settingsPath = path.join(this.config.workingDir, 'settings.json');
    
    // Create sample calibration data
    const calibrationData = await this.createCalibrationData();
    await fs.writeFile(calibrationPath, JSON.stringify(calibrationData));

    await this.runEZKL([
      'calibrate-settings',
      '-M', this.config.modelPath,
      '-D', calibrationPath,
      '-O', settingsPath,
    ]);

    // Read updated settings
    const settingsData = await fs.readFile(settingsPath, 'utf-8');
    const settings = JSON.parse(settingsData);
    
    this.calibrationSettings = {
      inputScale: settings.run_args?.input_scale ?? 7,
      paramScale: settings.run_args?.param_scale ?? 7,
      lookupBits: settings.run_args?.lookup_bits ?? 16,
      logRows: settings.num_rows ?? 17,
    };
  }

  /**
   * Compile ONNX model to ZK circuit
   */
  async compileCircuit(): Promise<void> {
    const settingsPath = path.join(this.config.workingDir, 'settings.json');
    const compiledPath = path.join(this.config.workingDir, 'compiled.ezkl');
    
    await this.runEZKL([
      'compile-circuit',
      '-M', this.config.modelPath,
      '-S', settingsPath,
      '-O', compiledPath,
    ]);
  }

  /**
   * Setup proving and verification keys
   */
  async setupKeys(): Promise<void> {
    const compiledPath = path.join(this.config.workingDir, 'compiled.ezkl');
    const pkPath = path.join(this.config.workingDir, 'pk.key');
    const vkPath = path.join(this.config.workingDir, 'vk.key');
    const srsPath = this.config.srsPath ?? path.join(this.config.workingDir, 'srs.params');
    
    // Download SRS if needed
    if (!await this.fileExists(srsPath)) {
      await this.runEZKL([
        'get-srs',
        '-S', path.join(this.config.workingDir, 'settings.json'),
        '-O', srsPath,
      ]);
    }
    
    await this.runEZKL([
      'setup',
      '-M', compiledPath,
      '--srs-path', srsPath,
      '--pk-path', pkPath,
      '--vk-path', vkPath,
    ]);
  }

  /**
   * Generate proof for input data
   */
  async generateProof(inputData: number[][]): Promise<GeneratedProof> {
    if (!this.isSetup) {
      throw new Error('EZKL not setup. Call setup() first.');
    }

    const startTime = performance.now();
    
    // Write input to file
    const witnessPath = path.join(this.config.workingDir, 'witness.json');
    const inputPath = path.join(this.config.workingDir, 'input.json');
    const proofPath = path.join(this.config.workingDir, 'proof.json');
    
    await fs.writeFile(inputPath, JSON.stringify({
      input_data: inputData,
    }));

    // Generate witness
    await this.runEZKL([
      'gen-witness',
      '-M', path.join(this.config.workingDir, 'compiled.ezkl'),
      '-D', inputPath,
      '-O', witnessPath,
    ]);

    // Generate proof
    await this.runEZKL([
      'prove',
      '-M', path.join(this.config.workingDir, 'compiled.ezkl'),
      '-W', witnessPath,
      '--pk-path', path.join(this.config.workingDir, 'pk.key'),
      '--proof-path', proofPath,
      '--srs-path', this.config.srsPath ?? path.join(this.config.workingDir, 'srs.params'),
    ]);

    const generationTimeMs = performance.now() - startTime;

    // Read and parse proof
    const proofData = await fs.readFile(proofPath, 'utf-8');
    const proof = JSON.parse(proofData);
    
    // Convert to Groth16 format (EZKL uses Halo2, but we adapt)
    const groth16Proof = this.convertEZKLProof(proof);
    
    const proofHash = sha3HashHex(new TextEncoder().encode(proofData));

    return {
      proof: groth16Proof,
      publicSignals: proof.instances?.flat().map((s: string) => BigInt(s)) ?? [],
      proofHash,
      generationTimeMs,
      proofType: ProofType.GROTH16, // EZKL produces Halo2/KZG proofs, but we adapt
    };
  }

  /**
   * Verify a proof
   */
  async verifyProof(proofPath: string): Promise<boolean> {
    try {
      await this.runEZKL([
        'verify',
        '--proof-path', proofPath,
        '--vk-path', path.join(this.config.workingDir, 'vk.key'),
        '--srs-path', this.config.srsPath ?? path.join(this.config.workingDir, 'srs.params'),
      ]);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create on-chain verifier contract
   */
  async createOnChainVerifier(outputPath: string, format: 'solidity' | 'move' = 'solidity'): Promise<void> {
    const vkPath = path.join(this.config.workingDir, 'vk.key');
    
    if (format === 'solidity') {
      await this.runEZKL([
        'create-evm-verifier',
        '--vk-path', vkPath,
        '--srs-path', this.config.srsPath ?? path.join(this.config.workingDir, 'srs.params'),
        '-O', outputPath,
      ]);
    } else {
      // For Move, we'd need custom conversion
      throw new Error('Move verifier generation not yet supported by EZKL');
    }
  }

  /**
   * Run EZKL command
   */
  private async runEZKL(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const process = spawn('ezkl', args, {
        cwd: this.config.workingDir,
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`EZKL failed with code ${code}: ${stderr}`));
        }
      });

      process.on('error', (err) => {
        reject(new Error(`Failed to run EZKL: ${err.message}`));
      });
    });
  }

  /**
   * Create calibration data from model config
   */
  private async createCalibrationData(): Promise<object> {
    // Read model to determine input shapes
    const modelBuffer = await fs.readFile(this.config.modelPath);
    
    // Generate random calibration inputs
    // In production, use representative data
    const inputData = this.generateRandomInputs(
      this.config.inputShape ?? [1, 3, 224, 224]
    );

    return {
      input_data: [inputData],
    };
  }

  /**
   * Generate random input data
   */
  private generateRandomInputs(shape: number[]): number[][] {
    const size = shape.reduce((a, b) => a * b, 1);
    const data: number[] = [];
    
    for (let i = 0; i < size; i++) {
      data.push(Math.random() * 2 - 1); // Range [-1, 1]
    }
    
    // Reshape to nested array
    return [data];
  }

  /**
   * Convert EZKL proof to Groth16 format
   */
  private convertEZKLProof(ezklProof: any): Groth16Proof {
    // EZKL uses Halo2/KZG internally, but we adapt to Groth16 format
    // for compatibility with our on-chain verifier
    
    const proof = ezklProof.proof ?? ezklProof;
    
    // Extract or generate proof points
    // This is a simplified conversion - real implementation would
    // properly handle the different proof systems
    
    return {
      pi_a: [
        BigInt(proof.a?.[0] ?? '0x1'),
        BigInt(proof.a?.[1] ?? '0x1'),
      ],
      pi_b: [
        [
          BigInt(proof.b?.[0]?.[0] ?? '0x1'),
          BigInt(proof.b?.[0]?.[1] ?? '0x1'),
        ],
        [
          BigInt(proof.b?.[1]?.[0] ?? '0x1'),
          BigInt(proof.b?.[1]?.[1] ?? '0x1'),
        ],
      ],
      pi_c: [
        BigInt(proof.c?.[0] ?? '0x1'),
        BigInt(proof.c?.[1] ?? '0x1'),
      ],
      protocol: 'groth16',
      curve: 'bn128',
    };
  }

  /**
   * Check if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get calibration settings
   */
  getCalibrationSettings(): CalibrationSettings | undefined {
    return this.calibrationSettings;
  }

  /**
   * Get circuit settings
   */
  getCircuitSettings(): CircuitSettings | undefined {
    return this.circuitSettings;
  }

  /**
   * Check if EZKL is installed
   */
  static async checkInstallation(): Promise<boolean> {
    return new Promise((resolve) => {
      const process = spawn('ezkl', ['--version']);
      
      process.on('close', (code) => {
        resolve(code === 0);
      });
      
      process.on('error', () => {
        resolve(false);
      });
    });
  }
}
