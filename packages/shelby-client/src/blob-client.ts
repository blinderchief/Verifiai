/**
 * @fileoverview Shelby Blob Client
 * @description Core client for Shelby Protocol blob storage
 */

import { sha3HashHex, bytesToHex, hexToBytes } from '@verifiai/core';
import {
  ShelbyConfig,
  ShelbyNetwork,
  BlobMetadata,
  BlobUploadRequest,
  BlobUploadResult,
  BlobQueryOptions,
  BlobQueryResult,
  StorageStats,
} from './types';

/**
 * Network endpoints
 * @see https://docs.shelby.xyz/protocol/architecture/networks
 */
const NETWORK_ENDPOINTS: Record<ShelbyNetwork, string> = {
  mainnet: 'https://rpc.shelby.xyz',
  testnet: 'https://rpc.testnet.shelby.xyz',
  devnet: 'https://rpc.devnet.shelby.xyz',
  shelbynet: 'https://rpc.shelby.xyz',
  local: 'http://localhost:8080',
};

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Partial<ShelbyConfig> = {
  maxBlobSize: 10 * 1024 * 1024, // 10MB
  timeout: 2000, // Reduced timeout for faster failure
  retries: 1, // Reduced retries for demo mode
};

/**
 * Shelby blob storage client
 */
export class ShelbyBlobClient {
  private config: Required<ShelbyConfig>;
  private nodeUrl: string;

  constructor(config: ShelbyConfig) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      privateKey: config.privateKey ?? '',
      nodeUrl: config.nodeUrl ?? '',
      maxBlobSize: config.maxBlobSize ?? DEFAULT_CONFIG.maxBlobSize!,
      timeout: config.timeout ?? DEFAULT_CONFIG.timeout!,
      retries: config.retries ?? DEFAULT_CONFIG.retries!,
    };
    
    this.nodeUrl = this.config.nodeUrl || NETWORK_ENDPOINTS[this.config.network];
  }

  /**
   * Upload a blob to Shelby
   */
  async uploadBlob(request: BlobUploadRequest): Promise<BlobUploadResult> {
    // Validate size
    if (request.data.length > this.config.maxBlobSize) {
      throw new Error(
        `Blob size ${request.data.length} exceeds maximum ${this.config.maxBlobSize}`
      );
    }

    // Encrypt if key provided
    let data = request.data;
    if (request.encryptionKey) {
      data = await this.encryptData(data, request.encryptionKey);
    }

    // Calculate hash
    const hash = sha3HashHex(data);

    // Prepare metadata
    const metadata: BlobMetadata = {
      id: '', // Will be set after upload
      contentType: request.contentType,
      size: data.length,
      hash,
      createdAt: Date.now(),
      expiresAt: request.ttl ? Date.now() + request.ttl * 1000 : undefined,
      tags: request.tags ?? {},
      owner: await this.getAddress(),
    };

    // Upload to Shelby
    const result = await this.uploadToShelby(data, metadata);

    return result;
  }

  /**
   * Download a blob from Shelby
   */
  async downloadBlob(
    blobId: string,
    decryptionKey?: Uint8Array
  ): Promise<Uint8Array> {
    let data = await this.downloadFromShelby(blobId);

    // Decrypt if key provided
    if (decryptionKey) {
      data = await this.decryptData(data, decryptionKey);
    }

    return data;
  }

  /**
   * Get blob metadata
   */
  async getBlobMetadata(blobId: string): Promise<BlobMetadata | null> {
    try {
      const response = await this.apiCall(`/blobs/${blobId}/metadata`, 'GET');
      return response as BlobMetadata;
    } catch {
      return null;
    }
  }

  /**
   * Check if blob exists
   */
  async blobExists(blobId: string): Promise<boolean> {
    const metadata = await this.getBlobMetadata(blobId);
    return metadata !== null;
  }

  /**
   * Delete a blob
   */
  async deleteBlob(blobId: string): Promise<boolean> {
    try {
      await this.apiCall(`/blobs/${blobId}`, 'DELETE');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Alias for deleteBlob
   */
  async delete(blobId: string): Promise<boolean> {
    return this.deleteBlob(blobId);
  }

  /**
   * Store data - alias for uploadBlob with simplified signature
   */
  async store(
    data: Uint8Array,
    contentType: string,
    metadata?: Record<string, string>
  ): Promise<BlobUploadResult> {
    return this.uploadBlob({
      data,
      contentType,
      tags: metadata,
    });
  }

  /**
   * Retrieve data - alias for downloadBlob with metadata
   */
  async retrieve(
    blobId: string
  ): Promise<{ data: Uint8Array; metadata: BlobMetadata | null } | null> {
    try {
      const data = await this.downloadBlob(blobId);
      const metadata = await this.getBlobMetadata(blobId);
      return { data, metadata };
    } catch {
      return null;
    }
  }

  /**
   * Get metadata - alias for getBlobMetadata
   */
  async getMetadata(blobId: string): Promise<BlobMetadata | null> {
    return this.getBlobMetadata(blobId);
  }

  /**
   * Query blobs
   */
  async queryBlobs(options: BlobQueryOptions): Promise<BlobQueryResult> {
    const params = new URLSearchParams();
    
    if (options.owner) params.set('owner', options.owner);
    if (options.contentType) params.set('contentType', options.contentType);
    if (options.tag) {
      params.set('tagKey', options.tag.key);
      params.set('tagValue', options.tag.value);
    }
    if (options.limit) params.set('limit', options.limit.toString());
    if (options.offset) params.set('offset', options.offset.toString());
    if (options.sortBy) params.set('sortBy', options.sortBy);
    if (options.sortOrder) params.set('sortOrder', options.sortOrder);

    const response = await this.apiCall(`/blobs?${params.toString()}`, 'GET');
    return response as BlobQueryResult;
  }

  /**
   * List all blobs - alias for queryBlobs with no options
   */
  async listBlobs(options?: { limit?: number; cursor?: string }): Promise<BlobQueryResult> {
    return this.queryBlobs(options || {});
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<StorageStats> {
    const response = await this.apiCall('/stats', 'GET');
    return response as StorageStats;
  }

  /**
   * Upload blob in chunks for large files
   */
  async uploadLargeBlob(
    data: Uint8Array,
    contentType: string,
    chunkSize: number = 1024 * 1024 // 1MB chunks
  ): Promise<{ blobIds: string[]; totalHash: string }> {
    const chunks: Uint8Array[] = [];
    
    for (let i = 0; i < data.length; i += chunkSize) {
      chunks.push(data.slice(i, i + chunkSize));
    }

    const blobIds: string[] = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      if (!chunk) continue;
      
      const result = await this.uploadBlob({
        data: chunk,
        contentType,
        tags: {
          chunkIndex: i.toString(),
          totalChunks: chunks.length.toString(),
        },
      });
      blobIds.push(result.blobId);
    }

    return {
      blobIds,
      totalHash: sha3HashHex(data),
    };
  }

  /**
   * Download and reassemble chunked blob
   */
  async downloadLargeBlob(blobIds: string[]): Promise<Uint8Array> {
    const chunks: Uint8Array[] = [];
    
    for (const blobId of blobIds) {
      const chunk = await this.downloadBlob(blobId);
      chunks.push(chunk);
    }

    // Combine chunks
    const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    return result;
  }

  /**
   * Get current address from private key
   */
  private async getAddress(): Promise<string> {
    if (!this.config.privateKey) {
      return '0x0';
    }
    // In production, derive address from private key
    // For now, hash the private key
    return '0x' + sha3HashHex(hexToBytes(this.config.privateKey)).slice(0, 40);
  }

  /**
   * Upload data to Shelby network
   */
  private async uploadToShelby(
    data: Uint8Array,
    metadata: BlobMetadata
  ): Promise<BlobUploadResult> {
    // Simulate upload (in production, use actual Shelby SDK)
    const blobId = sha3HashHex(data).slice(0, 16);
    
    const result: BlobUploadResult = {
      blobId,
      hash: metadata.hash,
      storageCost: BigInt(data.length * 100), // Cost based on size
      metadata: {
        ...metadata,
        id: blobId,
      },
    };

    // In production:
    // const shelbyClient = new ShelbyNodeClient({ network: Network.SHELBYNET });
    // const result = await shelbyClient.uploadBlob(data, metadata);

    return result;
  }

  /**
   * Download data from Shelby network
   */
  private async downloadFromShelby(blobId: string): Promise<Uint8Array> {
    // In production:
    // const shelbyClient = new ShelbyNodeClient({ network: Network.SHELBYNET });
    // return await shelbyClient.downloadBlob(blobId);

    // Simulate download
    const response = await this.apiCall(`/blobs/${blobId}/data`, 'GET');
    
    if (typeof response === 'string') {
      return hexToBytes(response);
    } else if (typeof response === 'object' && response !== null) {
      // Handle JSON objects (for swarm memory, etc.)
      const jsonString = JSON.stringify(response);
      return new TextEncoder().encode(jsonString);
    }
    
    return new Uint8Array(response as ArrayBuffer);
  }

  /**
   * Encrypt data with key
   */
  private async encryptData(
    data: Uint8Array,
    key: Uint8Array
  ): Promise<Uint8Array> {
    // Use Web Crypto API for encryption
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      data
    );

    // Prepend IV to encrypted data
    const result = new Uint8Array(iv.length + encrypted.byteLength);
    result.set(iv);
    result.set(new Uint8Array(encrypted), iv.length);

    return result;
  }

  /**
   * Decrypt data with key
   */
  private async decryptData(
    data: Uint8Array,
    key: Uint8Array
  ): Promise<Uint8Array> {
    const iv = data.slice(0, 12);
    const encrypted = data.slice(12);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      encrypted
    );

    return new Uint8Array(decrypted);
  }

  /**
   * Make API call with retries
   */
  private async apiCall(
    path: string,
    method: 'GET' | 'POST' | 'DELETE',
    body?: unknown
  ): Promise<unknown> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.config.retries; attempt++) {
      try {
        const response = await fetch(`${this.nodeUrl}${path}`, {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...(this.config.privateKey && {
              Authorization: `Bearer ${this.config.privateKey}`,
            }),
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: AbortSignal.timeout(this.config.timeout),
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        return response.json();
      } catch (error) {
        lastError = error as Error;
        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }

    throw lastError ?? new Error('API call failed');
  }
}
