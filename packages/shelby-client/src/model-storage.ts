/**
 * @fileoverview Model Storage Client
 * @description Storage for AI model weights and configurations
 */

import { sha3HashHex } from '@verifiai/core';
import { ShelbyBlobClient } from './blob-client';
import { ShelbyConfig, StoredModel } from './types';

/**
 * Content type for model metadata
 */
const MODEL_METADATA_CONTENT_TYPE = 'application/vnd.verifiai.model-metadata+json';

/**
 * Content type for model weights
 */
const MODEL_WEIGHTS_CONTENT_TYPE = 'application/vnd.verifiai.model-weights';

/**
 * Default chunk size for model uploads (5MB)
 */
const DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024;

/**
 * Model storage client for AI models
 */
export class ModelStorageClient {
  private blobClient: ShelbyBlobClient;
  private modelCache: Map<string, StoredModel> = new Map();

  constructor(config: ShelbyConfig) {
    this.blobClient = new ShelbyBlobClient(config);
  }

  /**
   * Store a model on Shelby
   */
  async storeModel(
    modelData: Uint8Array,
    metadata: Omit<StoredModel, 'hash' | 'chunkBlobIds' | 'totalSize'>
  ): Promise<StoredModel> {
    const hash = sha3HashHex(modelData);

    // Upload model data in chunks
    const { blobIds } = await this.blobClient.uploadLargeBlob(
      modelData,
      MODEL_WEIGHTS_CONTENT_TYPE,
      DEFAULT_CHUNK_SIZE
    );

    // Create stored model record
    const storedModel: StoredModel = {
      ...metadata,
      hash,
      chunkBlobIds: blobIds,
      totalSize: modelData.length,
    };

    // Store metadata
    await this.storeModelMetadata(storedModel);
    this.modelCache.set(storedModel.modelId, storedModel);

    return storedModel;
  }

  /**
   * Download a model from Shelby
   */
  async downloadModel(modelId: string): Promise<{
    data: Uint8Array;
    metadata: StoredModel;
  } | null> {
    const metadata = await this.getModelMetadata(modelId);
    if (!metadata) return null;

    // Download all chunks
    const data = await this.blobClient.downloadLargeBlob(metadata.chunkBlobIds);

    // Verify hash
    const hash = sha3HashHex(data);
    if (hash !== metadata.hash) {
      throw new Error(`Model hash mismatch: expected ${metadata.hash}, got ${hash}`);
    }

    return { data, metadata };
  }

  /**
   * Get model metadata
   */
  async getModelMetadata(modelId: string): Promise<StoredModel | null> {
    // Check cache
    const cached = this.modelCache.get(modelId);
    if (cached) return cached;

    // Query from storage
    const result = await this.blobClient.queryBlobs({
      tag: { key: 'modelId', value: modelId },
      contentType: MODEL_METADATA_CONTENT_TYPE,
      limit: 1,
    });

    if (result.blobs.length === 0) return null;

    const blob = result.blobs[0];
    if (!blob) return null;

    const data = await this.blobClient.downloadBlob(blob.id);
    const metadata = JSON.parse(new TextDecoder().decode(data)) as StoredModel;
    
    this.modelCache.set(modelId, metadata);
    return metadata;
  }

  /**
   * List all models
   */
  async listModels(
    framework?: 'onnx' | 'pytorch' | 'tensorflow',
    limit: number = 100
  ): Promise<StoredModel[]> {
    const queryOptions: Parameters<ShelbyBlobClient['queryBlobs']>[0] = {
      contentType: MODEL_METADATA_CONTENT_TYPE,
      limit,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    };

    if (framework) {
      queryOptions.tag = { key: 'framework', value: framework };
    }

    const result = await this.blobClient.queryBlobs(queryOptions);

    const models: StoredModel[] = [];
    for (const blob of result.blobs) {
      const data = await this.blobClient.downloadBlob(blob.id);
      const metadata = JSON.parse(new TextDecoder().decode(data)) as StoredModel;
      models.push(metadata);
    }

    return models;
  }

  /**
   * Delete a model
   */
  async deleteModel(modelId: string): Promise<boolean> {
    const metadata = await this.getModelMetadata(modelId);
    if (!metadata) return false;

    // Delete all chunks
    for (const blobId of metadata.chunkBlobIds) {
      await this.blobClient.deleteBlob(blobId);
    }

    // Delete metadata
    const result = await this.blobClient.queryBlobs({
      tag: { key: 'modelId', value: modelId },
      contentType: MODEL_METADATA_CONTENT_TYPE,
      limit: 1,
    });

    if (result.blobs.length > 0 && result.blobs[0]) {
      await this.blobClient.deleteBlob(result.blobs[0].id);
    }

    this.modelCache.delete(modelId);
    return true;
  }

  /**
   * Check if model exists
   */
  async modelExists(modelId: string): Promise<boolean> {
    const metadata = await this.getModelMetadata(modelId);
    return metadata !== null;
  }

  /**
   * Verify model integrity
   */
  async verifyModelIntegrity(modelId: string): Promise<{
    valid: boolean;
    expectedHash: string;
    actualHash?: string;
  }> {
    const metadata = await this.getModelMetadata(modelId);
    if (!metadata) {
      return { valid: false, expectedHash: '' };
    }

    try {
      const data = await this.blobClient.downloadLargeBlob(metadata.chunkBlobIds);
      const actualHash = sha3HashHex(data);

      return {
        valid: actualHash === metadata.hash,
        expectedHash: metadata.hash,
        actualHash,
      };
    } catch {
      return { valid: false, expectedHash: metadata.hash };
    }
  }

  /**
   * Get model by hash
   */
  async getModelByHash(hash: string): Promise<StoredModel | null> {
    const result = await this.blobClient.queryBlobs({
      tag: { key: 'modelHash', value: hash },
      contentType: MODEL_METADATA_CONTENT_TYPE,
      limit: 1,
    });

    if (result.blobs.length === 0 || !result.blobs[0]) return null;

    const data = await this.blobClient.downloadBlob(result.blobs[0].id);
    return JSON.parse(new TextDecoder().decode(data)) as StoredModel;
  }

  /**
   * Update model metadata
   */
  async updateModelMetadata(
    modelId: string,
    updates: Partial<Pick<StoredModel, 'name' | 'version' | 'metadata'>>
  ): Promise<StoredModel | null> {
    const existing = await this.getModelMetadata(modelId);
    if (!existing) return null;

    const updated: StoredModel = {
      ...existing,
      ...updates,
    };

    await this.storeModelMetadata(updated);
    this.modelCache.set(modelId, updated);

    return updated;
  }

  /**
   * Store model metadata
   */
  private async storeModelMetadata(model: StoredModel): Promise<string> {
    const data = new TextEncoder().encode(JSON.stringify(model));

    const result = await this.blobClient.uploadBlob({
      data,
      contentType: MODEL_METADATA_CONTENT_TYPE,
      tags: {
        modelId: model.modelId,
        modelHash: model.hash,
        framework: model.framework,
        name: model.name,
        version: model.version,
      },
    });

    return result.blobId;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.modelCache.clear();
  }
}
