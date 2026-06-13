/**
 * Nhận diện lỗi mạng tạm thời tới gateway Discord (ECONNRESET, socket hang up,
 * TLS rớt, timeout của undici, và crash handshake của thư viện ws). Đây là nhiễu
 * mạng — discord.js sẽ tự kết nối lại; ta nuốt êm để không làm sập process.
 */
export function isTransientNetworkError(err: any): boolean {
  const code = err?.code ?? err?.rawError?.code;
  const msg = String(err?.message ?? err ?? '');
  const stack = String(err?.stack ?? '');
  const netCodes = [
    'ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'EPIPE', 'ENOTFOUND', 'EAI_AGAIN',
    'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_SOCKET', 'UND_ERR_HEADERS_TIMEOUT',
  ];
  if (code && netCodes.includes(code)) return true;
  if (/socket hang up|ECONNRESET|secure TLS connection|network socket disconnected|EPIPE/i.test(msg)) return true;
  // Crash của ws khi hủy handshake lúc kết nối chập chờn: Cannot read ... 'setHeader'.
  if (/setHeader/.test(msg) && /ws[\\/]lib[\\/]websocket/.test(stack)) return true;
  return false;
}
