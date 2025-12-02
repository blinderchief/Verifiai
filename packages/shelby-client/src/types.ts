/**
 * @fileoverview Shelby Client Types
 * @description Type definitions for Shelby Protocol integration
 */

/**
 * Shelby network configuration
 */
export type ShelbyNetwork = 'mainnet' | 'testnet' | 'devnet' | 'shelbynet' | 'local';

/**
 * Blob storage configuration
 */
export interface ShelbyConfig {
  /** Network to connect to */
  network: ShelbyNetwork;
  /** Custom node URL (optional) */
  nodeUrl?: string;
  /** Private key for signing (hex string) */
  privateKey?: string;
  /** Maximum blob size in bytes */
  maxBlobSize?: number;
  /** Timeout for operations in ms */
  timeout?: number;
  /** Number of retry attempts */
  retries?: number;
}

/**
 * Blob metadata
 */
export interface BlobMetadata {
  /** Unique blob ID */
  id: string;
  /** Content type (MIME) */
  contentType: string;
  /** Size in bytes */
  size: number;
  /** SHA3 hash of content */
  hash: string;
  /** Creation timestamp */
  createdAt: number;
  /** Expiration timestamp (if applicable) */
  expiresAt?: number;
  /** Custom tags */
  tags: Record<string, string>;
  /** Owner address */
  owner: string;
}

/**
 * Blob upload request
 */
export interface BlobUploadRequest {
  /** Raw data to upload */
  data: Uint8Array;
  /** Content type */
  contentType: string;
  /** Custom tags */
  tags?: Record<string, string>;
  /** Time-to-live in seconds (0 = permanent) */
  ttl?: number;
  /** Encryption key (optional) */
  encryptionKey?: Uint8Array;
}

/**
 * Blob upload result
 */
export interface BlobUploadResult {
  /** Blob ID */
  blobId: string;
  /** Content hash */
  hash: string;
  /** Transaction hash on Aptos */
  txHash?: string;
  /** Storage cost in OCTAS */
  storageCost: bigint;
  /** Metadata */
  metadata: BlobMetadata;
}

/**
 * Proof storage format
 */
export interface StoredProof {
  /** Proof ID (blob ID) */
  proofId: string;
  /** Proof type */
  proofType: 'groth16' | 'bulletproofs' | 'hybrid';
  /** Serialized proof data */
  proofData: string;
  /** Public signals */
  publicSignals: string[];
  /** Model hash */
  modelHash: string;
  /** Inference metadata */
  inferenceMetadata: {
    /** Inference time in ms */
    inferenceTimeMs: number;
    /** Model path or identifier */
    modelId: string;
    /** Input hash */
    inputHash: string;
    /** Output hash */
    outputHash: string;
  };
  /** Generation timestamp */
  timestamp: number;
  /** Agent address that generated the proof */
  agentAddress: string;
}

/**
 * Swarm shared memory format
 */
export interface SwarmMemory {
  /** Swarm ID */
  swarmId: string;
  /** Memory version */
  version: number;
  /** Key-value store */
  data: Record<string, unknown>;
  /** Last update timestamp */
  lastUpdated: number;
  /** Contributing agents */
  contributors: string[];
  /** Memory checksum */
  checksum: string;
}

/**
 * Model weights storage
 */
export interface StoredModel {
  /** Model ID */
  modelId: string;
  /** Model name */
  name: string;
  /** Model version */
  version: string;
  /** Framework (onnx, pytorch, tensorflow) */
  framework: 'onnx' | 'pytorch' | 'tensorflow';
  /** Model hash */
  hash: string;
  /** Input shape */
  inputShape: number[];
  /** Output shape */
  outputShape: number[];
  /** Blob IDs for model chunks */
  chunkBlobIds: string[];
  /** Total size in bytes */
  totalSize: number;
  /** Metadata */
  metadata: Record<string, unknown>;
}

/**
 * Query options for listing blobs
 */
export interface BlobQueryOptions {
  /** Filter by owner */
  owner?: string;
  /** Filter by content type */
  contentType?: string;
  /** Filter by tag */
  tag?: { key: string; value: string };
  /** Limit results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Sort order */
  sortBy?: 'createdAt' | 'size';
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Blob query result
 */
export interface BlobQueryResult {
  /** Matching blobs */
  blobs: BlobMetadata[];
  /** Total count */
  total: number;
  /** Has more results */
  hasMore: boolean;
}

/**
 * Storage statistics
 */
export interface StorageStats {
  /** Total blobs */
  totalBlobs: number;
  /** Total size in bytes */
  totalSize: number;
  /** Proofs stored */
  proofsStored: number;
  /** Models stored */
  modelsStored: number;
  /** Active swarms with memory */
  activeSwarms: number;
}
