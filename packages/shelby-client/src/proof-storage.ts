/**
 * @fileoverview Proof Storage Client
 * @description Specialized client for storing and retrieving proofs
 */

import { sha3HashHex, bytesToHex } from '@verifiai/core';
import { ShelbyBlobClient } from './blob-client';
import {
  ShelbyConfig,
  StoredProof,
  BlobMetadata,
} from './types';

/**
 * Content type for proofs
 */
const PROOF_CONTENT_TYPE = 'application/vnd.verifiai.proof+json';

/**
 * Proof storage client for VerifiAI proofs
 */
export class ProofStorageClient {
  private blobClient: ShelbyBlobClient;

  constructor(config: ShelbyConfig) {
    this.blobClient = new ShelbyBlobClient(config);
  }

  /**
   * Store a proof on Shelby
   */
  async storeProof(
    proof: StoredProof,
    ttl?: number
  ): Promise<{ proofId: string; txHash?: string }> {
    // Serialize proof
    const proofData = JSON.stringify(proof);
    const data = new TextEncoder().encode(proofData);

    // Upload to Shelby
    const result = await this.blobClient.uploadBlob({
      data,
      contentType: PROOF_CONTENT_TYPE,
      tags: {
        proofType: proof.proofType,
        modelHash: proof.modelHash,
        agentAddress: proof.agentAddress,
        timestamp: proof.timestamp.toString(),
      },
      ttl,
    });

    return {
      proofId: result.blobId,
      txHash: result.txHash,
    };
  }

  /**
   * Retrieve a proof from Shelby
   */
  async getProof(proofId: string): Promise<StoredProof | null> {
    try {
      const data = await this.blobClient.downloadBlob(proofId);
      const proofData = new TextDecoder().decode(data);
      return JSON.parse(proofData) as StoredProof;
    } catch {
      return null;
    }
  }

  /**
   * Verify proof integrity
   */
  async verifyProofIntegrity(proofId: string): Promise<{
    valid: boolean;
    hash: string;
    storedHash: string;
  }> {
    const metadata = await this.blobClient.getBlobMetadata(proofId);
    if (!metadata) {
      return { valid: false, hash: '', storedHash: '' };
    }

    const data = await this.blobClient.downloadBlob(proofId);
    const computedHash = sha3HashHex(data);

    return {
      valid: computedHash === metadata.hash,
      hash: computedHash,
      storedHash: metadata.hash,
    };
  }

  /**
   * Query proofs by agent
   */
  async getProofsByAgent(
    agentAddress: string,
    limit: number = 100
  ): Promise<StoredProof[]> {
    const result = await this.blobClient.queryBlobs({
      tag: { key: 'agentAddress', value: agentAddress },
      contentType: PROOF_CONTENT_TYPE,
      limit,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    const proofs: StoredProof[] = [];
    for (const blob of result.blobs) {
      const proof = await this.getProof(blob.id);
      if (proof) {
        proofs.push(proof);
      }
    }

    return proofs;
  }

  /**
   * Query proofs by model
   */
  async getProofsByModel(
    modelHash: string,
    limit: number = 100
  ): Promise<StoredProof[]> {
    const result = await this.blobClient.queryBlobs({
      tag: { key: 'modelHash', value: modelHash },
      contentType: PROOF_CONTENT_TYPE,
      limit,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    const proofs: StoredProof[] = [];
    for (const blob of result.blobs) {
      const proof = await this.getProof(blob.id);
      if (proof) {
        proofs.push(proof);
      }
    }

    return proofs;
  }

  /**
   * Query proofs by type
   */
  async getProofsByType(
    proofType: 'groth16' | 'bulletproofs' | 'hybrid',
    limit: number = 100
  ): Promise<StoredProof[]> {
    const result = await this.blobClient.queryBlobs({
      tag: { key: 'proofType', value: proofType },
      contentType: PROOF_CONTENT_TYPE,
      limit,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    const proofs: StoredProof[] = [];
    for (const blob of result.blobs) {
      const proof = await this.getProof(blob.id);
      if (proof) {
        proofs.push(proof);
      }
    }

    return proofs;
  }

  /**
   * Get proof count for agent
   */
  async getProofCount(agentAddress: string): Promise<number> {
    const result = await this.blobClient.queryBlobs({
      tag: { key: 'agentAddress', value: agentAddress },
      contentType: PROOF_CONTENT_TYPE,
      limit: 1,
    });

    return result.total;
  }

  /**
   * Delete a proof
   */
  async deleteProof(proofId: string): Promise<boolean> {
    return this.blobClient.deleteBlob(proofId);
  }

  /**
   * List proofs with optional filtering
   */
  async listProofs(options?: {
    agentAddress?: string;
    modelHash?: string;
    proofType?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ proofs: StoredProof[]; total: number }> {
    const queryOptions: Parameters<typeof this.blobClient.queryBlobs>[0] = {
      contentType: PROOF_CONTENT_TYPE,
      limit: options?.limit ?? 100,
      offset: options?.offset ?? 0,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    };
    
    if (options?.agentAddress) {
      queryOptions.tag = { key: 'agentAddress', value: options.agentAddress };
    } else if (options?.modelHash) {
      queryOptions.tag = { key: 'modelHash', value: options.modelHash };
    } else if (options?.proofType) {
      queryOptions.tag = { key: 'proofType', value: options.proofType };
    }
    
    const result = await this.blobClient.queryBlobs(queryOptions);
    
    const proofs: StoredProof[] = [];
    for (const blob of result.blobs) {
      const proof = await this.getProof(blob.id);
      if (proof) {
        proofs.push(proof);
      }
    }
    
    return { proofs, total: result.total };
  }

  /**
   * Retrieve a proof - alias for getProof
   */
  async retrieveProof(proofId: string): Promise<StoredProof | null> {
    return this.getProof(proofId);
  }

  /**
   * Get proof metadata without downloading full proof
   */
  async getProofMetadata(proofId: string): Promise<BlobMetadata | null> {
    return this.blobClient.getBlobMetadata(proofId);
  }

  /**
   * Batch store multiple proofs
   */
  async storeProofBatch(
    proofs: StoredProof[],
    ttl?: number
  ): Promise<{ proofIds: string[]; failures: number }> {
    const proofIds: string[] = [];
    let failures = 0;

    for (const proof of proofs) {
      try {
        const result = await this.storeProof(proof, ttl);
        proofIds.push(result.proofId);
      } catch {
        failures++;
      }
    }

    return { proofIds, failures };
  }

  /**
   * Create a proof reference for on-chain storage
   */
  createProofReference(proofId: string, proof: StoredProof): {
    blobId: string;
    proofHash: string;
    modelHash: string;
    timestamp: number;
  } {
    // Create minimal reference for on-chain storage
    return {
      blobId: proofId,
      proofHash: sha3HashHex(new TextEncoder().encode(proof.proofData)),
      modelHash: proof.modelHash,
      timestamp: proof.timestamp,
    };
  }
}
