/**
 * @fileoverview Error constants for VerifiAI Protocol
 * @description Standardized error codes and messages
 */

/**
 * Error code categories
 */
export const ErrorCategory = {
  PROOF: 'PROOF',
  AGENT: 'AGENT',
  SWARM: 'SWARM',
  SETTLEMENT: 'SETTLEMENT',
  NETWORK: 'NETWORK',
  VALIDATION: 'VALIDATION',
  AUTH: 'AUTH',
  STORAGE: 'STORAGE',
} as const;

/**
 * Complete error code definitions
 */
export const ErrorCodes = {
  // Proof errors
  PROOF_NOT_FOUND: {
    code: 'PROOF_001',
    message: 'Proof not found',
  },
  PROOF_ALREADY_EXISTS: {
    code: 'PROOF_002',
    message: 'Proof with this ID already exists',
  },
  PROOF_INVALID_FORMAT: {
    code: 'PROOF_003',
    message: 'Invalid proof format',
  },
  PROOF_VERIFICATION_FAILED: {
    code: 'PROOF_004',
    message: 'Proof verification failed',
  },
  PROOF_EXPIRED: {
    code: 'PROOF_005',
    message: 'Proof has expired',
  },
  PROOF_INVALID_TYPE: {
    code: 'PROOF_006',
    message: 'Invalid proof type',
  },
  
  // Agent errors
  AGENT_NOT_FOUND: {
    code: 'AGENT_001',
    message: 'Agent not found',
  },
  AGENT_ALREADY_EXISTS: {
    code: 'AGENT_002',
    message: 'Agent with this ID already exists',
  },
  AGENT_INACTIVE: {
    code: 'AGENT_003',
    message: 'Agent is inactive',
  },
  AGENT_NOT_AUTHORIZED: {
    code: 'AGENT_004',
    message: 'Not authorized to perform this action on agent',
  },
  AGENT_MAX_REACHED: {
    code: 'AGENT_005',
    message: 'Maximum number of agents reached',
  },
  
  // Swarm errors
  SWARM_NOT_FOUND: {
    code: 'SWARM_001',
    message: 'Swarm not found',
  },
  SWARM_ALREADY_EXISTS: {
    code: 'SWARM_002',
    message: 'Swarm with this ID already exists',
  },
  SWARM_FULL: {
    code: 'SWARM_003',
    message: 'Swarm has reached maximum capacity',
  },
  SWARM_NOT_MEMBER: {
    code: 'SWARM_004',
    message: 'Agent is not a member of this swarm',
  },
  SWARM_ALREADY_MEMBER: {
    code: 'SWARM_005',
    message: 'Agent is already a member of this swarm',
  },
  SWARM_INACTIVE: {
    code: 'SWARM_006',
    message: 'Swarm is inactive',
  },
  TASK_NOT_FOUND: {
    code: 'SWARM_007',
    message: 'Task not found',
  },
  
  // Settlement errors
  SETTLEMENT_NOT_FOUND: {
    code: 'SETTLE_001',
    message: 'Settlement not found',
  },
  SETTLEMENT_ALREADY_EXISTS: {
    code: 'SETTLE_002',
    message: 'Settlement with this ID already exists',
  },
  SETTLEMENT_INVALID_STATE: {
    code: 'SETTLE_003',
    message: 'Invalid settlement state for this operation',
  },
  SETTLEMENT_EXPIRED: {
    code: 'SETTLE_004',
    message: 'Settlement has expired',
  },
  SETTLEMENT_NOT_VERIFIED: {
    code: 'SETTLE_005',
    message: 'Settlement proof not verified',
  },
  SETTLEMENT_INSUFFICIENT_FUNDS: {
    code: 'SETTLE_006',
    message: 'Insufficient funds for settlement',
  },
  
  // Network errors
  NETWORK_CONNECTION_FAILED: {
    code: 'NET_001',
    message: 'Failed to connect to network',
  },
  NETWORK_TIMEOUT: {
    code: 'NET_002',
    message: 'Network request timed out',
  },
  NETWORK_RATE_LIMITED: {
    code: 'NET_003',
    message: 'Rate limit exceeded',
  },
  TRANSACTION_FAILED: {
    code: 'NET_004',
    message: 'Transaction failed',
  },
  
  // Validation errors
  VALIDATION_INVALID_ADDRESS: {
    code: 'VAL_001',
    message: 'Invalid Aptos address format',
  },
  VALIDATION_INVALID_HEX: {
    code: 'VAL_002',
    message: 'Invalid hex string format',
  },
  VALIDATION_REQUIRED_FIELD: {
    code: 'VAL_003',
    message: 'Required field is missing',
  },
  VALIDATION_INVALID_VALUE: {
    code: 'VAL_004',
    message: 'Invalid value provided',
  },
  
  // Auth errors
  AUTH_UNAUTHORIZED: {
    code: 'AUTH_001',
    message: 'Unauthorized access',
  },
  AUTH_INVALID_SIGNATURE: {
    code: 'AUTH_002',
    message: 'Invalid signature',
  },
  AUTH_WALLET_NOT_CONNECTED: {
    code: 'AUTH_003',
    message: 'Wallet not connected',
  },
  
  // Storage errors
  STORAGE_UPLOAD_FAILED: {
    code: 'STOR_001',
    message: 'Failed to upload to storage',
  },
  STORAGE_DOWNLOAD_FAILED: {
    code: 'STOR_002',
    message: 'Failed to download from storage',
  },
  STORAGE_BLOB_NOT_FOUND: {
    code: 'STOR_003',
    message: 'Blob not found in storage',
  },
} as const;

export type ErrorCode = keyof typeof ErrorCodes;
