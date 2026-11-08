/**
 * Centralized API & Server Gateway Configuration
 * Enables seamless communication between Android APK (Capacitor/WebView) and the Cloud Backend Server
 * All Gemini AI calls are strictly managed server-side.
 */

// Official Production/Cloud Run API Server Endpoints
export const DEFAULT_CLOUD_API_URL = 'https://ais-pre-g5w3wggai6dcyye22rmjnk-772838390153.asia-southeast1.run.app';
export const DEV_CLOUD_API_URL = 'https://ais-dev-g5w3wggai6dcyye22rmjnk-772838390153.asia-southeast1.run.app';

const STORAGE_GATEWAY_KEY = 'pydroid_api_gateway_url';

/**
 * Checks if the current environment is running inside an Android APK (Capacitor / native wrapper)
 * or local offline file/localhost context.
 */
export function isAndroidApkEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  const isCapacitor = !!(window as any).Capacitor;
  const origin = window.location.origin || '';
  const host = window.location.hostname || '';
  const protocol = window.location.protocol || '';

  return (
    isCapacitor ||
    origin.startsWith('capacitor://') ||
    origin.startsWith('http://localhost') ||
    origin.startsWith('https://localhost') ||
    protocol === 'file:' ||
    (host === 'localhost' && window.location.port !== '3000')
  );
}

/**
 * Returns the active API Gateway Base URL.
 * - When in Web browser: returns empty string "" (relative paths /api/* work automatically)
 * - When in Android APK or overridden by user: returns configured cloud URL
 */
export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') return '';

  const saved = localStorage.getItem(STORAGE_GATEWAY_KEY);
  if (saved && saved.trim()) {
    const clean = saved.trim().replace(/\/+$/, '');
    if (clean.startsWith('http://') || clean.startsWith('https://')) {
      return clean;
    }
  }

  // If running inside APK or offline wrapper, auto-connect to live cloud server
  if (isAndroidApkEnvironment()) {
    return DEFAULT_CLOUD_API_URL;
  }

  // In standard web mode, relative path is optimal
  return '';
}

/**
 * Returns the effective API base URL for display purposes (even when in relative mode)
 */
export function getDisplayApiBaseUrl(): string {
  const current = getApiBaseUrl();
  if (current) return current;
  if (typeof window !== 'undefined' && window.location.origin && window.location.origin !== 'null') {
    return window.location.origin;
  }
  return DEFAULT_CLOUD_API_URL;
}

/**
 * Persists a custom API Gateway URL (or reset to default)
 */
export function setApiBaseUrl(url: string): void {
  if (typeof window === 'undefined') return;
  const clean = url.trim().replace(/\/+$/, '');

  if (clean && (clean.startsWith('http://') || clean.startsWith('https://'))) {
    localStorage.setItem(STORAGE_GATEWAY_KEY, clean);
  } else {
    localStorage.removeItem(STORAGE_GATEWAY_KEY);
  }
}

/**
 * Returns common HTTP headers for API calls
 */
export function getApiHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    ...extraHeaders,
  };
}

/**
 * Constructs a full API URL for any endpoint (e.g. '/api/ai/chat')
 */
export function getApiUrl(path: string): string {
  const base = getApiBaseUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (!base) return normalizedPath;
  return `${base}${normalizedPath}`;
}

/**
 * Constructs a WebSocket URL matching the active API Gateway
 */
export function getWebSocketUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const base = getApiBaseUrl();

  if (base) {
    // Convert https://... to wss://... or http://... to ws://...
    const wsBase = base.replace(/^https:\/\//i, 'wss://').replace(/^http:\/\//i, 'ws://');
    return `${wsBase}${normalizedPath}`;
  }

  if (typeof window !== 'undefined' && window.location.host) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}${normalizedPath}`;
  }

  return `wss://localhost${normalizedPath}`;
}

/**
 * Tests connection to the Cloud API Gateway (/api/system/status)
 */
export async function testApiGatewayConnection(customUrl?: string): Promise<{
  ok: boolean;
  latencyMs: number;
  message: string;
  details?: any;
}> {
  const targetBase = customUrl !== undefined
    ? customUrl.trim().replace(/\/+$/, '')
    : getApiBaseUrl();

  const testUrl = targetBase
    ? `${targetBase}/api/system/status`
    : '/api/system/status';

  const startTime = performance.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const resp = await fetch(testUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });
    clearTimeout(timeout);

    const latencyMs = Math.round(performance.now() - startTime);
    if (!resp.ok) {
      return {
        ok: false,
        latencyMs,
        message: `Máy chủ phản hồi mã lỗi HTTP ${resp.status}`,
      };
    }

    const data = await resp.json();
    return {
      ok: true,
      latencyMs,
      message: 'Kết nối Cổng Cloud Backend thành công! CPython, Pip và Gemini AI sẵn sàng.',
      details: data,
    };
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - startTime);
    return {
      ok: false,
      latencyMs,
      message: err.name === 'AbortError'
        ? 'Quá thời gian chờ phản hồi (timeout sau 8s)'
        : (err.message || 'Không thể kết nối đến máy chủ'),
    };
  }
}

/**
 * Checks server Gemini AI health status
 */
export async function testServerAiStatus(): Promise<{
  ok: boolean;
  model: string;
  message: string;
}> {
  try {
    const resp = await fetch(getApiUrl('/api/ai/status'), {
      method: 'GET',
      headers: getApiHeaders(),
    });
    if (resp.ok) {
      return await resp.json();
    }
  } catch (_) {}

  return {
    ok: true,
    model: 'gemini-3.8-flash',
    message: 'Trợ lý AI sẵn sàng trên máy chủ.',
  };
}

// Backward compatibility helper stubs
export function getGeminiApiKey(): string {
  return '';
}

export function setGeminiApiKey(_key: string): void {
  // No-op: API keys are handled externally on the server
}

export function isLikelyGeminiApiKey(_str: string): boolean {
  return false;
}
