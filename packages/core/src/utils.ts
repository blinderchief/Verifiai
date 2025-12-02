/**
 * @fileoverview Utility functions for VerifiAI Protocol
 * @description Common utilities for hashing, encoding, and validation
 */

import { sha3_256 } from '@noble/hashes/sha3';

// ============ Hashing Utilities ============

/**
 * Compute SHA3-256 hash of data
 */
export function sha3Hash(data: Uint8Array | string): Uint8Array {
  const input = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  return sha3_256(input);
}

/**
 * Compute SHA3-256 hash and return as hex string
 */
export function sha3HashHex(data: Uint8Array | string): string {
  return bytesToHex(sha3Hash(data));
}

// ============ Encoding Utilities ============

/**
 * Convert bytes to hex string
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert hex string to bytes
 */
export function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (cleanHex.length % 2 !== 0) {
    throw new Error('Invalid hex string length');
  }
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    const byte = parseInt(cleanHex.slice(i, i + 2), 16);
    if (isNaN(byte)) {
      throw new Error(`Invalid hex character at position ${i}`);
    }
    bytes[i / 2] = byte;
  }
  return bytes;
}

/**
 * Convert string to bytes (UTF-8)
 */
export function stringToBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/**
 * Convert bytes to string (UTF-8)
 */
export function bytesToString(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

/**
 * Convert bytes to base64 string
 */
export function bytesToBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64');
}

/**
 * Convert base64 string to bytes
 */
export function base64ToBytes(base64: string): Uint8Array {
  return new Uint8Array(Buffer.from(base64, 'base64'));
}

// ============ ID Generation ============

/**
 * Generate a unique ID with prefix
 */
export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return prefix ? `${prefix}_${timestamp}${randomPart}` : `${timestamp}${randomPart}`;
}

/**
 * Generate a proof ID
 */
export function generateProofId(): string {
  return generateId('proof');
}

/**
 * Generate an agent ID
 */
export function generateAgentId(): string {
  return generateId('agent');
}

/**
 * Generate a swarm ID
 */
export function generateSwarmId(): string {
  return generateId('swarm');
}

/**
 * Generate a task ID
 */
export function generateTaskId(): string {
  return generateId('task');
}

/**
 * Generate a settlement ID
 */
export function generateSettlementId(): string {
  return generateId('settle');
}

// ============ Validation Utilities ============

/**
 * Validate Aptos address format
 */
export function isValidAptosAddress(address: string): boolean {
  // Aptos addresses are 64 hex characters (32 bytes) with optional 0x prefix
  const cleanAddress = address.startsWith('0x') ? address.slice(2) : address;
  return /^[0-9a-fA-F]{64}$/.test(cleanAddress);
}

/**
 * Normalize Aptos address to lowercase with 0x prefix
 */
export function normalizeAddress(address: string): string {
  const cleanAddress = address.startsWith('0x') ? address.slice(2) : address;
  return `0x${cleanAddress.toLowerCase()}`;
}

/**
 * Validate hex string format
 */
export function isValidHex(hex: string): boolean {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  return /^[0-9a-fA-F]*$/.test(cleanHex) && cleanHex.length % 2 === 0;
}

/**
 * Validate proof data length based on type
 */
export function isValidProofLength(
  proofData: Uint8Array,
  proofType: 'groth16' | 'bulletproofs' | 'hybrid'
): boolean {
  const minLengths = {
    groth16: 256,
    bulletproofs: 512,
    hybrid: 32,
  };
  return proofData.length >= minLengths[proofType];
}

// ============ Time Utilities ============

/**
 * Get current timestamp in microseconds (Aptos format)
 */
export function nowMicroseconds(): bigint {
  return BigInt(Date.now()) * 1000n;
}

/**
 * Convert microseconds to Date
 */
export function microsecondsToDate(microseconds: bigint | number): Date {
  return new Date(Number(BigInt(microseconds) / 1000n));
}

/**
 * Convert Date to microseconds
 */
export function dateToMicroseconds(date: Date): bigint {
  return BigInt(date.getTime()) * 1000n;
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(date: Date): string {
  return date.toISOString();
}

// ============ Retry Utilities ============

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};

/**
 * Execute a function with exponential backoff retry
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const { maxRetries, baseDelay, maxDelay, backoffMultiplier } = {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
  };

  let lastError: Error | undefined;
  let delay = baseDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxRetries) {
        break;
      }

      await sleep(delay);
      delay = Math.min(delay * backoffMultiplier, maxDelay);
    }
  }

  throw lastError;
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============ Chunk Utilities ============

/**
 * Split data into chunks of specified size
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Split bytes into chunks
 */
export function chunkBytes(data: Uint8Array, chunkSize: number): Uint8Array[] {
  const chunks: Uint8Array[] = [];
  for (let i = 0; i < data.length; i += chunkSize) {
    chunks.push(data.slice(i, i + chunkSize));
  }
  return chunks;
}

// ============ Error Utilities ============

/**
 * VerifiAI error class
 */
export class VerifiAIError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'VerifiAIError';
  }
}

/**
 * Create a typed error
 */
export function createError(
  code: string,
  message: string,
  details?: Record<string, unknown>
): VerifiAIError {
  return new VerifiAIError(message, code, details);
}

/**
 * Check if error is a VerifiAI error
 */
export function isVerifiAIError(error: unknown): error is VerifiAIError {
  return error instanceof VerifiAIError;
}

// ============ Type Guards ============

/**
 * Check if value is defined (not null or undefined)
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Assert value is defined
 */
export function assertDefined<T>(
  value: T | null | undefined,
  message: string = 'Value is undefined'
): asserts value is T {
  if (!isDefined(value)) {
    throw new Error(message);
  }
}

/**
 * Check if value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Check if value is a positive number
 */
export function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && value > 0 && isFinite(value);
}
