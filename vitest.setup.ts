import { vi } from 'vitest';

// Global test setup
vi.stubGlobal('fetch', vi.fn());

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.APTOS_NETWORK = 'testnet';
process.env.SHELBY_API_KEY = 'test-shelby-key';
process.env.GEMINI_API_KEY = 'test-gemini-key';
process.env.GEMINI_MODEL = 'gemini-2.0-flash';

// Console spy to reduce noise in tests
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'info').mockImplementation(() => {});
vi.spyOn(console, 'debug').mockImplementation(() => {});

// Keep errors and warnings visible
// vi.spyOn(console, 'error');
// vi.spyOn(console, 'warn');
