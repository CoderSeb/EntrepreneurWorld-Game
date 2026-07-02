import { ApiErrorBody } from '@/services/api/types';

export type ApiResult<T> =
  | { success: true; data: T; status: number }
  | { success: false; error: ApiErrorBody; status: number };

export function isApiFailure<T>(
  result: ApiResult<T>,
): result is { success: false; error: ApiErrorBody; status: number } {
  return result.success === false;
}

type RequestOptions = {
  method: 'GET' | 'POST' | 'PUT';
  path: string;
  body?: unknown;
  accessToken?: string | null;
};

export class ApiClient {
  constructor(private readonly baseUrl: string) {}

  async get<T>(path: string, accessToken?: string | null): Promise<ApiResult<T>> {
    return this.request<T>({ method: 'GET', path, accessToken });
  }

  async post<T>(path: string, body: unknown, accessToken?: string | null): Promise<ApiResult<T>> {
    return this.request<T>({ method: 'POST', path, body, accessToken });
  }

  async put<T>(path: string, body: unknown, accessToken?: string | null): Promise<ApiResult<T>> {
    return this.request<T>({ method: 'PUT', path, body, accessToken });
  }

  /** Lightweight reachability check — ASP.NET /health returns plain text, not JSON. */
  async ping(path: string): Promise<{ ok: boolean; status: number; message?: string }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: 'GET',
        headers: { Accept: '*/*' },
        signal: controller.signal,
      });
      if (response.ok) {
        return { ok: true, status: response.status };
      }
      return { ok: false, status: response.status, message: `HTTP ${response.status}` };
    } catch (error) {
      const message =
        error instanceof Error && error.name === 'AbortError'
          ? 'Request timed out — start API with pwsh ./scripts/run-api-with-postgres.ps1'
          : error instanceof Error
            ? error.message
            : 'Network request failed';
      return { ok: false, status: 0, message };
    } finally {
      clearTimeout(timeout);
    }
  }

  private async request<T>(options: RequestOptions): Promise<ApiResult<T>> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    if (options.accessToken) {
      headers.Authorization = `Bearer ${options.accessToken}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    try {
      const response = await fetch(`${this.baseUrl}${options.path}`, {
        method: options.method,
        headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      if (response.status === 204) {
        return { success: true, data: undefined as T, status: response.status };
      }

      const text = await response.text();
      let parsed: unknown = null;
      if (text.trim()) {
        try {
          parsed = JSON.parse(text);
        } catch {
          const hint = text.trimStart().startsWith('<')
            ? 'Server returned HTML — is the API running on port 5080?'
            : text.trimStart().startsWith('H')
              ? 'Server returned plain text (check /health vs /api/v1). Start API: pwsh ./scripts/run-api-with-postgres.ps1'
              : 'Server returned non-JSON response';
          return {
            success: false,
            error: { code: 'invalid_response', message: hint },
            status: response.status || 0,
          };
        }
      }

      if (!response.ok) {
        const error = parseApiError(parsed, response.status);
        return { success: false, error, status: response.status };
      }

      return { success: true, data: parsed as T, status: response.status };
    } catch (error) {
      const message =
        error instanceof Error && error.name === 'AbortError'
          ? 'Request timed out — start API with pwsh ./scripts/run-api-with-postgres.ps1'
          : error instanceof Error
            ? error.message
            : 'Network request failed';
      return {
        success: false,
        error: { code: 'network_error', message },
        status: 0,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}

function parseApiError(parsed: unknown, status: number): ApiErrorBody {
  if (parsed && typeof parsed === 'object') {
    const body = parsed as Record<string, unknown>;
    const code = String(body.code ?? `http_${status}`);
    const message = String(body.message ?? 'Request failed');
    return { code, message };
  }
  return { code: `http_${status}`, message: 'Request failed' };
}
