import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  ShelbyBlobClient,
  ProofStorageClient,
  SwarmMemoryClient,
  type BlobUploadRequest,
  type StoredProof,
} from '../src';

// Mock Shelby SDK - not used by current implementation
vi.mock('@shelby-protocol/sdk', () => ({
  ShelbyClient: vi.fn(),
}));

// Mock core utilities
vi.mock('@verifiai/core', () => ({
  sha3HashHex: vi.fn((data: Uint8Array) => {
    // Return predictable hash for testing
    const dataStr = new TextDecoder().decode(data);
    if (dataStr === 'test model data') return 'e4e8619e68c2d4421234567890abcdef'; // 'test model data'
    if (data.length === 10485760) return 'largefile1234567890abcdef123456'; // 10MB data
    if (dataStr.includes('proofType')) return 'proof1234567890abcdef1234567890'; // proof JSON
    if (dataStr.includes('swarmId')) return 'swarm1234567890abcdef1234567890'; // swarm memory JSON
    return 'default1234567890abcdef1234567890';
  }),
  bytesToHex: vi.fn((bytes: Uint8Array) => Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')),
  hexToBytes: vi.fn((hex: string) => {
    const result = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      result[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return result;
  }),
}));

// Mock fetch for API calls
global.fetch = vi.fn((url: string, options?: any) => {
  const urlStr = typeof url === 'string' ? url : url.toString();
  
  if (urlStr.includes('/blobs/') && options?.method === 'GET' && urlStr.includes('/data')) {
    // Download blob data - return different data based on context
    if (urlStr.includes('swarm-blob-1')) {
      // Swarm memory data - return parsed JSON object
      const swarmMemoryData = {
        swarmId: 'default',
        version: 1,
        data: { 'test-key': { key: 'value', count: 42 } },
        lastUpdated: Date.now(),
        contributors: [],
        checksum: 'swarm1234567890abcdef1234567890',
      };
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(swarmMemoryData),
      });
    } else {
      // Regular blob data - return hex string
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve('746573742064617461'), // hex for 'test data'
      });
    }
  } else if (urlStr.includes('/blobs?') && urlStr.includes('swarmId')) {
    // Query blobs for swarm memory
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        blobs: [
          { id: 'swarm-blob-1', name: 'swarm-memory.json', size: 1024, hash: 'hash1', createdAt: Date.now() },
        ],
        cursor: null,
        total: 1,
      }),
    });
  } else if (urlStr.includes('/blobs?')) {
    // List/query blobs
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        blobs: [
          { id: 'blob-1', name: 'test-1.bin', size: 512, hash: 'hash1', createdAt: Date.now() },
          { id: 'blob-2', name: 'test-2.bin', size: 1024, hash: 'hash2', createdAt: Date.now() },
        ],
        cursor: null,
        total: 2,
      }),
    });
  } else if (urlStr.includes('/blobs/') && options?.method === 'DELETE') {
    // Delete blob
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
  } else if (urlStr.includes('/blobs/') && urlStr.includes('/metadata') && options?.method === 'GET') {
    // Get blob metadata
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        id: 'blob-123',
        contentType: 'application/octet-stream',
        size: 1024,
        hash: 'sha256-abc123',
        createdAt: Date.now(),
      }),
    });
  } else if (urlStr.includes('/stats')) {
    // Get stats
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        totalBlobs: 10,
        totalSize: 10240,
        totalCost: '1000000',
      }),
    });
  }
  
  // Default response
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  });
});

describe('ShelbyBlobClient', () => {
  let client: ShelbyBlobClient;

  beforeEach(() => {
    client = new ShelbyBlobClient({
      apiKey: 'test-api-key',
      network: 'testnet',
    });
  });

  describe('uploadBlob', () => {
    it('should upload a blob successfully', async () => {
      const data = Buffer.from('test model data');
      const request: BlobUploadRequest = {
        data: new Uint8Array(data),
        contentType: 'application/octet-stream',
        tags: { version: '1.0' },
      };

      const result = await client.uploadBlob(request);

      expect(result).toBeDefined();
      expect(result.blobId).toBe('e4e8619e68c2d442');
      expect(result.hash).toBeDefined();
    });

    it('should handle large files with chunking', async () => {
      const largeData = Buffer.alloc(10 * 1024 * 1024); // 10MB
      const request: BlobUploadRequest = {
        data: new Uint8Array(largeData),
        contentType: 'application/octet-stream',
      };

      const result = await client.uploadBlob(request);

      expect(result.blobId).toBeDefined();
    });
  });

  describe('downloadBlob', () => {
    it('should download a blob by ID', async () => {
      const result = await client.downloadBlob('blob-123');

      expect(result).toBeDefined();
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('listBlobs', () => {
    it('should list all blobs', async () => {
      const result = await client.listBlobs();

      expect(result.blobs).toHaveLength(2);
      expect(result.blobs[0].id).toBe('blob-1');
    });

    it('should support pagination', async () => {
      const result = await client.listBlobs({ limit: 10, cursor: null });

      expect(result.cursor).toBeNull();
    });
  });
});

describe('ProofStorageClient', () => {
  let storage: ProofStorageClient;

  beforeEach(() => {
    storage = new ProofStorageClient({
      apiKey: 'test-api-key',
      network: 'testnet',
    });
  });

  describe('storeProof', () => {
    it('should store a proof record', async () => {
      const proof: StoredProof = {
        proofId: 'proof-001',
        proofType: 'groth16',
        proofData: 'base64-encoded-proof',
        publicSignals: ['100', '200'],
        modelHash: 'model-hash-123',
        inferenceMetadata: {
          inferenceTimeMs: 150,
          modelId: 'model-123',
          inputHash: 'input-hash',
          outputHash: 'output-hash',
        },
        timestamp: Date.now(),
        agentAddress: 'agent-123',
      };

      const result = await storage.storeProof(proof);

      expect(result.proofId).toBeDefined();
      expect(result.proofId).toBe('proof1234567890a');
    });

    it('should store proof with metadata', async () => {
      const proof: StoredProof = {
        proofId: 'proof-002',
        proofType: 'bulletproofs',
        proofData: 'base64-encoded-proof',
        publicSignals: ['300'],
        modelHash: 'model-hash-456',
        inferenceMetadata: {
          inferenceTimeMs: 200,
          modelId: 'model-456',
          inputHash: 'input-hash-2',
          outputHash: 'output-hash-2',
        },
        timestamp: Date.now(),
        agentAddress: 'agent-456',
        metadata: {
          version: '2.0',
          verificationKey: 'vk-123',
        },
      } as StoredProof & { metadata?: any };

      const result = await storage.storeProof(proof);

      expect(result.proofId).toBeDefined();
    });
  });

  describe('retrieveProof', () => {
    it('should retrieve a proof by ID', async () => {
      const proof = await storage.retrieveProof('proof-001');

      expect(proof).toBeDefined();
    });
  });
});

describe('SwarmMemoryClient', () => {
  let memory: SwarmMemoryClient;

  beforeEach(() => {
    memory = new SwarmMemoryClient({
      apiKey: 'test-api-key',
      network: 'testnet',
      swarmId: 'swarm-001',
    });
  });

  describe('write', () => {
    it('should write data to swarm memory', async () => {
      const data = { key: 'value', count: 42 };

      const result = await memory.write('test-key', data);

      expect(result.success).toBe(true);
    });

    it('should support TTL for expiring data', async () => {
      const data = { temporary: true };

      const result = await memory.write('temp-key', data, { ttl: 3600 });

      expect(result.success).toBe(true);
    });
  });

  describe('read', () => {
    it('should read data from swarm memory', async () => {
      const data = await memory.read('test-key');

      expect(data).toBeDefined();
    });

    it('should return null for non-existent keys', async () => {
      const data = await memory.read('non-existent-key');

      expect(data).toBeNull();
    });
  });

  describe('sync', () => {
    it('should sync memory across swarm nodes', async () => {
      const result = await memory.sync();

      expect(result.synced).toBe(true);
    });
  });
});
