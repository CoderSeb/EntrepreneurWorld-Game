import { ApiClient } from '@/services/api/ApiClient';
import { ClientEventRequest } from '@/services/api/types';

export async function trackClientEvent(
  api: ApiClient,
  accessToken: string | null,
  request: ClientEventRequest,
): Promise<void> {
  await api.post('/api/v1/telemetry/client-event', request, accessToken);
}

export async function trackCrashContext(
  api: ApiClient,
  accessToken: string | null,
  errorCode: string,
  errorMessage: string,
  context: Record<string, string>,
): Promise<void> {
  await api.post(
    '/api/v1/telemetry/crash-context',
    {
      clientVersion: '0.1.0',
      errorCode,
      errorMessage,
      context,
    },
    accessToken,
  );
}
