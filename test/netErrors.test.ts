import { describe, it, expect } from 'vitest';
import { isTransientNetworkError } from '../src/utils/netErrors';

describe('isTransientNetworkError', () => {
  it('detects ECONNRESET / socket hang up to Discord gateway', () => {
    expect(isTransientNetworkError({ code: 'ECONNRESET', host: 'gateway.discord.gg' })).toBe(true);
    expect(isTransientNetworkError(new Error('socket hang up'))).toBe(true);
    expect(isTransientNetworkError(new Error('Client network socket disconnected before secure TLS connection was established'))).toBe(true);
  });

  it('detects undici connect/headers timeouts', () => {
    expect(isTransientNetworkError({ code: 'UND_ERR_CONNECT_TIMEOUT' })).toBe(true);
    expect(isTransientNetworkError({ code: 'ETIMEDOUT' })).toBe(true);
  });

  it('detects the ws handshake-abort setHeader crash', () => {
    const err = new TypeError("Cannot read properties of null (reading 'setHeader')");
    err.stack = "TypeError ...\n    at abortHandshake (/app/node_modules/ws/lib/websocket.js:1108:14)";
    expect(isTransientNetworkError(err)).toBe(true);
  });

  it('does NOT swallow real application errors', () => {
    expect(isTransientNetworkError(new Error('Cannot read properties of undefined (reading name)'))).toBe(false);
    expect(isTransientNetworkError(new TypeError('player.atk is not a function'))).toBe(false);
    expect(isTransientNetworkError({ code: 'ERR_SOMETHING_ELSE' })).toBe(false);
  });
});
