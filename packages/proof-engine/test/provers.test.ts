import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  Groth16Prover, 
  BulletproofsProver, 
  HybridProver,
  type ProofRequest 
} from '../src';

// Mock snarkjs
vi.mock('snarkjs', () => ({
  groth16: {
    fullProve: vi.fn().mockResolvedValue({
      proof: {
        pi_a: ['1', '2', '3'],
        pi_b: [['4', '5'], ['6', '7'], ['8', '9']],
        pi_c: ['10', '11', '12'],
        protocol: 'groth16',
        curve: 'bn128',
      },
      publicSignals: ['100', '200', '300'],
    }),
    verify: vi.fn().mockResolvedValue(true),
  },
}));

// Mock ONNXInferenceEngine
vi.mock('../src/inference', () => ({
  ONNXInferenceEngine: vi.fn().mockImplementation(() => ({
    session: {},
    loadModel: vi.fn().mockResolvedValue(undefined),
    runInference: vi.fn().mockResolvedValue({
      inputs: [{ data: new Float32Array([1, 2, 3, 4]), shape: [4], name: 'input' }],
      outputs: [{ data: new Float32Array([0.5, 0.3, 0.2]), shape: [3], name: 'output' }],
      modelHash: 'abc123def456',
      executionTime: 100,
      timestamp: Date.now(),
    }),
    isLoaded: vi.fn().mockReturnValue(true),
  })),
}));

describe('Groth16Prover', () => {
  let prover: Groth16Prover;

  beforeEach(() => {
    prover = new Groth16Prover({
      circuitsPath: './test/circuits',
      provingKeyPath: './test/keys/proving_key.json',
    });
  });

  describe('generateProof', () => {
    it('should generate a valid Groth16 proof', async () => {
      const request: ProofRequest = {
        modelId: 'test-model-001',
        inputs: [1.0, 2.0, 3.0, 4.0],
        outputs: [0.5, 0.3, 0.2],
        modelHash: 'abc123def456',
        timestamp: Date.now(),
      };

      const proof = await prover.generateProof(request);

      expect(proof).toBeDefined();
      expect(proof.proofType).toBe('groth16');
      expect(proof.proofData).toBeDefined();
      expect(proof.publicSignals).toBeDefined();
    });

    it('should include metadata in proof', async () => {
      const request: ProofRequest = {
        modelId: 'test-model-001',
        inputs: [1.0, 2.0, 3.0, 4.0],
        outputs: [0.5, 0.3, 0.2],
        modelHash: 'abc123def456',
        timestamp: Date.now(),
        metadata: { version: '1.0', author: 'test' },
      };

      const proof = await prover.generateProof(request);

      expect(proof.metadata).toBeDefined();
      expect(proof.metadata?.modelId).toBe('test-model-001');
    });
  });

  // describe('verifyProof', () => {
  //   it('should verify a valid proof', async () => {
  //     const request: ProofRequest = {
  //       modelId: 'test-model-001',
  //       inputs: [1.0, 2.0, 3.0, 4.0],
  //       outputs: [0.5, 0.3, 0.2],
  //       modelHash: 'abc123def456',
  //       timestamp: Date.now(),
  //     };

  //     // Initialize prover with verification key
  //     await prover.initialize();

  //     const proof = await prover.generateProof(request);
  //     const isValid = await prover.verifyProof(proof.proof as any, proof.publicSignals || []);

  //     expect(isValid).toBe(true);
  //   });
  // });
});

describe('BulletproofsProver', () => {
  let prover: BulletproofsProver;

  beforeEach(() => {
    prover = new BulletproofsProver({
      bitSize: 64,
    });
  });

  describe('generateProof', () => {
    it('should generate a valid Bulletproof', async () => {
      const request: ProofRequest = {
        modelId: 'test-model-002',
        inputs: [100, 200, 300],
        outputs: [150, 250],
        modelHash: 'xyz789',
        timestamp: Date.now(),
      };

      const proof = await prover.generateProof(request);

      expect(proof).toBeDefined();
      expect(proof.proofType).toBe('bulletproofs');
      expect(proof.proofData).toBeDefined();
    });

    it('should handle range proofs correctly', async () => {
      const request: ProofRequest = {
        modelId: 'test-model-002',
        inputs: [0, 1000, 5000],
        outputs: [500],
        modelHash: 'xyz789',
        timestamp: Date.now(),
      };

      const proof = await prover.generateProof(request);

      expect(proof.proof).toBeDefined();
      expect((proof.proof as any).A).toBeDefined(); // Check that it's a valid BulletproofsRangeProof
    });
  });
});

describe('HybridProver', () => {
  let prover: HybridProver;

  beforeEach(() => {
    prover = new HybridProver({
      teeProvider: 'sgx',
      includeGroth16: true,
      includeBulletproofs: true,
      securityLevel: 2,
    });
  });

  describe('generateProof', () => {
    it('should generate a hybrid TEE proof', async () => {
      const request: ProofRequest = {
        modelId: 'secure-model-001',
        inputs: [1, 2, 3],
        outputs: [6],
        modelHash: 'abcdef1234567890abcdef1234567890',
        timestamp: Date.now(),
      };

      const proof = await prover.generateProof(request);

      expect(proof).toBeDefined();
      expect(proof.proofType).toBe('hybrid');
      expect((proof.proof as any).attestation).toBeDefined();
    });

    it('should include SGX attestation report', async () => {
      const request: ProofRequest = {
        modelId: 'secure-model-001',
        inputs: [1, 2, 3],
        outputs: [6],
        modelHash: 'abcdef1234567890abcdef1234567890',
        timestamp: Date.now(),
      };

      const proof = await prover.generateProof(request);

      expect((proof.proof as any).attestation.provider).toBe('sgx');
      expect((proof.proof as any).attestation.quote).toBeDefined();
    });
  });
});
