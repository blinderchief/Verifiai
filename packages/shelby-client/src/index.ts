/**
 * @fileoverview Shelby Client Package Exports
 * @description Main entry point for @verifiai/shelby-client
 */

// Types - export type only
export type {
  ShelbyConfig,
  ShelbyNetwork,
  BlobMetadata,
  BlobUploadRequest,
  BlobUploadResult,
  StoredProof,
  SwarmMemory,
  StoredModel,
} from './types';

// Core Blob Client
export { ShelbyBlobClient } from './blob-client';

// Proof Storage
export { ProofStorageClient } from './proof-storage';

// Swarm Memory
export { SwarmMemoryClient } from './swarm-memory';
export type { MemoryUpdate, MemoryUpdateType } from './swarm-memory';

// Model Storage
export { ModelStorageClient } from './model-storage';
