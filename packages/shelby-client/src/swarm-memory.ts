/**
 * @fileoverview Swarm Memory Client
 * @description Shared memory storage for multi-agent swarms
 */

import { sha3HashHex } from '@verifiai/core';
import { ShelbyBlobClient } from './blob-client';
import { ShelbyConfig, SwarmMemory } from './types';

/**
 * Content type for swarm memory
 */
const SWARM_MEMORY_CONTENT_TYPE = 'application/vnd.verifiai.swarm-memory+json';

/**
 * Memory update types
 */
export type MemoryUpdateType = 'set' | 'merge' | 'delete' | 'append';

/**
 * Memory update operation
 */
export interface MemoryUpdate {
  type: MemoryUpdateType;
  key: string;
  value?: unknown;
  contributor: string;
}

/**
 * Swarm memory storage client
 */
export class SwarmMemoryClient {
  private blobClient: ShelbyBlobClient;
  private memoryCache: Map<string, SwarmMemory> = new Map();
  private updateQueue: Map<string, MemoryUpdate[]> = new Map();

  constructor(config: ShelbyConfig) {
    this.blobClient = new ShelbyBlobClient(config);
  }

  /**
   * Initialize swarm memory
   */
  async initializeMemory(swarmId: string, initialData?: Record<string, unknown>): Promise<SwarmMemory> {
    const memory: SwarmMemory = {
      swarmId,
      version: 1,
      data: initialData ?? {},
      lastUpdated: Date.now(),
      contributors: [],
      checksum: '',
    };

    memory.checksum = this.computeChecksum(memory);

    // Store initial memory
    await this.persistMemory(memory);
    this.memoryCache.set(swarmId, memory);

    return memory;
  }

  /**
   * Get swarm memory
   */
  async getMemory(swarmId: string): Promise<SwarmMemory | null> {
    // Check cache first
    const cached = this.memoryCache.get(swarmId);
    if (cached) {
      return cached;
    }

    // Load from storage
    const memory = await this.loadMemory(swarmId);
    if (memory) {
      this.memoryCache.set(swarmId, memory);
    }

    return memory;
  }

  /**
   * Update swarm memory
   */
  async updateMemory(
    swarmId: string,
    update: MemoryUpdate
  ): Promise<SwarmMemory> {
    let memory = await this.getMemory(swarmId);
    
    if (!memory) {
      memory = await this.initializeMemory(swarmId);
    }

    // Apply update
    memory = this.applyUpdate(memory, update);
    memory.version++;
    memory.lastUpdated = Date.now();
    
    // Add contributor if not already present
    if (!memory.contributors.includes(update.contributor)) {
      memory.contributors.push(update.contributor);
    }

    // Update checksum
    memory.checksum = this.computeChecksum(memory);

    // Persist and cache
    await this.persistMemory(memory);
    this.memoryCache.set(swarmId, memory);

    return memory;
  }

  /**
   * Batch update memory
   */
  async batchUpdateMemory(
    swarmId: string,
    updates: MemoryUpdate[]
  ): Promise<SwarmMemory> {
    let memory = await this.getMemory(swarmId);
    
    if (!memory) {
      memory = await this.initializeMemory(swarmId);
    }

    // Apply all updates
    for (const update of updates) {
      memory = this.applyUpdate(memory, update);
      
      if (!memory.contributors.includes(update.contributor)) {
        memory.contributors.push(update.contributor);
      }
    }

    memory.version++;
    memory.lastUpdated = Date.now();
    memory.checksum = this.computeChecksum(memory);

    // Persist and cache
    await this.persistMemory(memory);
    this.memoryCache.set(swarmId, memory);

    return memory;
  }

  /**
   * Get value from memory
   */
  async getValue<T>(swarmId: string, key: string): Promise<T | undefined> {
    const memory = await this.getMemory(swarmId);
    return memory?.data[key] as T | undefined;
  }

  /**
   * Set value in memory
   */
  async setValue<T>(
    swarmId: string,
    key: string,
    value: T,
    contributor: string
  ): Promise<void> {
    await this.updateMemory(swarmId, {
      type: 'set',
      key,
      value,
      contributor,
    });
  }

  /**
   * Delete value from memory
   */
  async deleteValue(
    swarmId: string,
    key: string,
    contributor: string
  ): Promise<void> {
    await this.updateMemory(swarmId, {
      type: 'delete',
      key,
      contributor,
    });
  }

  /**
   * Append to array in memory
   */
  async appendToArray<T>(
    swarmId: string,
    key: string,
    value: T,
    contributor: string
  ): Promise<void> {
    await this.updateMemory(swarmId, {
      type: 'append',
      key,
      value,
      contributor,
    });
  }

  /**
   * Verify memory integrity
   */
  async verifyIntegrity(swarmId: string): Promise<boolean> {
    const memory = await this.getMemory(swarmId);
    if (!memory) return false;

    const computedChecksum = this.computeChecksum(memory);
    return computedChecksum === memory.checksum;
  }

  /**
   * Get memory history (versions)
   */
  async getMemoryHistory(
    swarmId: string,
    limit: number = 10
  ): Promise<SwarmMemory[]> {
    const result = await this.blobClient.queryBlobs({
      tag: { key: 'swarmId', value: swarmId },
      contentType: SWARM_MEMORY_CONTENT_TYPE,
      limit,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    const history: SwarmMemory[] = [];
    for (const blob of result.blobs) {
      const data = await this.blobClient.downloadBlob(blob.id);
      const memory = JSON.parse(new TextDecoder().decode(data)) as SwarmMemory;
      history.push(memory);
    }

    return history;
  }

  /**
   * Clear memory cache
   */
  clearCache(): void {
    this.memoryCache.clear();
  }

  /**
   * Delete swarm memory
   */
  async deleteMemory(swarmId: string): Promise<boolean> {
    this.memoryCache.delete(swarmId);
    
    // Find and delete all versions
    const result = await this.blobClient.queryBlobs({
      tag: { key: 'swarmId', value: swarmId },
      contentType: SWARM_MEMORY_CONTENT_TYPE,
    });

    let success = true;
    for (const blob of result.blobs) {
      const deleted = await this.blobClient.deleteBlob(blob.id);
      if (!deleted) success = false;
    }

    return success;
  }

  /**
   * Write data to memory - alias for setValue
   */
  async write<T>(
    key: string,
    value: T,
    options?: { swarmId?: string; contributor?: string; ttl?: number }
  ): Promise<{ success: boolean; version: number }> {
    const swarmId = options?.swarmId ?? 'default';
    const contributor = options?.contributor ?? 'system';
    await this.setValue(swarmId, key, value, contributor);
    const memory = await this.getMemory(swarmId);
    return { success: true, version: memory?.version ?? 1 };
  }

  /**
   * Read data from memory - alias for getValue
   */
  async read<T>(key: string, swarmId: string = 'default'): Promise<T | null> {
    const value = await this.getValue<T>(swarmId, key);
    return value ?? null;
  }

  /**
   * List all keys in memory for a swarm
   */
  async list(options?: { swarmId?: string; limit?: number; offset?: number }): Promise<{
    keys: string[];
    total: number;
  }> {
    const swarmId = options?.swarmId ?? 'default';
    const memory = await this.getMemory(swarmId);
    if (!memory) {
      return { keys: [], total: 0 };
    }
    
    const allKeys = Object.keys(memory.data);
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? allKeys.length;
    const keys = allKeys.slice(offset, offset + limit);
    
    return { keys, total: allKeys.length };
  }

  /**
   * Delete a specific key from memory
   */
  async delete(key: string, swarmId: string = 'default', contributor: string = 'system'): Promise<boolean> {
    try {
      await this.deleteValue(swarmId, key, contributor);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get history for a swarm - alias for getMemoryHistory
   */
  async getHistory(swarmId: string = 'default', limit: number = 10): Promise<SwarmMemory[]> {
    return this.getMemoryHistory(swarmId, limit);
  }

  /**
   * Clear all data for a swarm
   */
  async clearSwarm(swarmId: string): Promise<boolean> {
    return this.deleteMemory(swarmId);
  }

  /**
   * Sync memory across swarm nodes
   */
  async sync(swarmId: string = 'default'): Promise<{ synced: boolean; nodes?: number }> {
    try {
      // In production, this would sync with other swarm nodes
      // For now, just ensure local memory is persisted
      const memory = await this.getMemory(swarmId);
      if (memory) {
        await this.persistMemory(memory);
      }
      return { synced: true, nodes: 1 };
    } catch {
      return { synced: false };
    }
  }

  /**
   * Apply update to memory
   */
  private applyUpdate(memory: SwarmMemory, update: MemoryUpdate): SwarmMemory {
    const newData = { ...memory.data };

    switch (update.type) {
      case 'set':
        newData[update.key] = update.value;
        break;
        
      case 'merge':
        if (typeof newData[update.key] === 'object' && typeof update.value === 'object') {
          newData[update.key] = {
            ...(newData[update.key] as object),
            ...(update.value as object),
          };
        } else {
          newData[update.key] = update.value;
        }
        break;
        
      case 'delete':
        delete newData[update.key];
        break;
        
      case 'append':
        if (Array.isArray(newData[update.key])) {
          (newData[update.key] as unknown[]).push(update.value);
        } else {
          newData[update.key] = [update.value];
        }
        break;
    }

    return {
      ...memory,
      data: newData,
    };
  }

  /**
   * Compute memory checksum
   */
  private computeChecksum(memory: SwarmMemory): string {
    const data = {
      swarmId: memory.swarmId,
      version: memory.version,
      data: memory.data,
      lastUpdated: memory.lastUpdated,
    };
    
    const serialized = JSON.stringify(data);
    return sha3HashHex(new TextEncoder().encode(serialized));
  }

  /**
   * Persist memory to storage
   */
  private async persistMemory(memory: SwarmMemory): Promise<string> {
    const data = new TextEncoder().encode(JSON.stringify(memory));
    
    const result = await this.blobClient.uploadBlob({
      data,
      contentType: SWARM_MEMORY_CONTENT_TYPE,
      tags: {
        swarmId: memory.swarmId,
        version: memory.version.toString(),
      },
    });

    return result.blobId;
  }

  /**
   * Load memory from storage
   */
  private async loadMemory(swarmId: string): Promise<SwarmMemory | null> {
    const result = await this.blobClient.queryBlobs({
      tag: { key: 'swarmId', value: swarmId },
      contentType: SWARM_MEMORY_CONTENT_TYPE,
      limit: 1,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    if (result.blobs.length === 0) {
      return null;
    }

    const blob = result.blobs[0];
    if (!blob) return null;

    const data = await this.blobClient.downloadBlob(blob.id);
    return JSON.parse(new TextDecoder().decode(data)) as SwarmMemory;
  }
}
