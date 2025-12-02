/**
 * @fileoverview ONNX Model Inference Engine
 * @description Handles AI model inference using ONNX Runtime
 */

import * as ort from 'onnxruntime-node';
import * as fs from 'fs/promises';
import * as path from 'path';
import { sha3HashHex } from '@verifiai/core';
import {
  ONNXModelConfig,
  InferenceInput,
  InferenceOutput,
  InferenceResult,
} from './types';

/**
 * ONNX inference engine for AI model execution
 */
export class ONNXInferenceEngine {
  private session: ort.InferenceSession | null = null;
  private modelConfig: ONNXModelConfig | null = null;
  private modelHash: string | null = null;

  /**
   * Load an ONNX model
   * @param config Model configuration
   */
  async loadModel(config: ONNXModelConfig): Promise<void> {
    // Verify model file exists
    try {
      await fs.access(config.modelPath);
    } catch {
      throw new Error(`Model file not found: ${config.modelPath}`);
    }

    // Read model file and compute hash
    const modelBuffer = await fs.readFile(config.modelPath);
    this.modelHash = sha3HashHex(new Uint8Array(modelBuffer));

    // Create inference session
    this.session = await ort.InferenceSession.create(config.modelPath, {
      executionProviders: ['cpu'], // Can be extended to 'cuda', 'coreml', etc.
      graphOptimizationLevel: 'all',
    });

    this.modelConfig = config;
  }

  /**
   * Check if a model is loaded
   * @returns True if a model is loaded
   */
  isLoaded(): boolean {
    return this.session !== null && this.modelConfig !== null && this.modelHash !== null;
  }

  /**
   * Run inference on the loaded model
   * @param inputs Array of inference inputs
   * @returns Inference result with outputs and timing
   */
  async runInference(inputs: InferenceInput[]): Promise<InferenceResult> {
    if (!this.session || !this.modelConfig || !this.modelHash) {
      throw new Error('Model not loaded. Call loadModel() first.');
    }

    // Build input feeds
    const feeds: Record<string, ort.Tensor> = {};
    for (const input of inputs) {
      feeds[input.name] = new ort.Tensor(
        input.data instanceof Float32Array ? 'float32' : 'float64',
        input.data,
        input.shape
      );
    }

    // Run inference with timing
    const startTime = performance.now();
    const results = await this.session.run(feeds);
    const inferenceTimeMs = performance.now() - startTime;

    // Extract outputs
    const outputs: InferenceOutput[] = [];
    for (const outputName of this.modelConfig.outputNames) {
      const output = results[outputName];
      if (output) {
        outputs.push({
          data: output.data as Float32Array | Float64Array,
          shape: output.dims as number[],
          name: outputName,
        });
      }
    }

    return {
      outputs,
      inferenceTimeMs,
      modelHash: this.modelHash,
    };
  }

  /**
   * Get model metadata
   */
  getModelInfo(): ONNXModelConfig | null {
    return this.modelConfig;
  }

  /**
   * Get model hash
   */
  getModelHash(): string | null {
    return this.modelHash;
  }

  /**
   * Close the inference session
   */
  async close(): Promise<void> {
    if (this.session) {
      // ORT sessions are automatically cleaned up
      this.session = null;
      this.modelConfig = null;
      this.modelHash = null;
    }
  }

  /**
   * Create a mock inference engine for testing
   */
  static createMock(): ONNXInferenceEngine {
    const engine = new ONNXInferenceEngine();
    // Override for testing
    return engine;
  }
}

/**
 * Helper to preprocess image data for common vision models
 */
export function preprocessImageForVision(
  imageData: Uint8Array,
  targetWidth: number,
  targetHeight: number,
  channels: number = 3
): Float32Array {
  // Normalize to [0, 1] range
  const normalized = new Float32Array(targetWidth * targetHeight * channels);
  const scale = 1 / 255;
  
  for (let i = 0; i < imageData.length && i < normalized.length; i++) {
    const value = imageData[i];
    normalized[i] = value !== undefined ? value * scale : 0;
  }
  
  return normalized;
}

/**
 * Helper to preprocess text data for NLP models
 */
export function preprocessTextForNLP(
  text: string,
  maxLength: number,
  vocab: Map<string, number>
): Float32Array {
  const tokens = text.toLowerCase().split(/\s+/);
  const encoded = new Float32Array(maxLength);
  
  for (let i = 0; i < Math.min(tokens.length, maxLength); i++) {
    const token = tokens[i];
    const tokenId = token ? vocab.get(token) ?? 0 : 0; // 0 for unknown
    encoded[i] = tokenId;
  }
  
  return encoded;
}

/**
 * Helper to create input tensor
 */
export function createInputTensor(
  data: Float32Array | Float64Array,
  shape: number[],
  name: string
): InferenceInput {
  return { data, shape, name };
}
