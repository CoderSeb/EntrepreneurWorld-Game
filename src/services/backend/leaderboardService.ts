import { ApiClient, ApiResult } from '@/services/api/ApiClient';
import { LeaderboardBoard, LeaderboardResponse } from '@/services/api/types';
import { getApiBaseUrl } from '@/config/backendConfig';
import { normalizeLeaderboardResponse } from '@/services/backend/leaderboardMapper';

export async function fetchLeaderboard(
  board: LeaderboardBoard,
  accessToken?: string | null,
  limit = 25,
): Promise<ApiResult<LeaderboardResponse>> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    return {
      success: false,
      error: { code: 'backend_disabled', message: 'Backend is not configured.' },
      status: 0,
    };
  }

  const api = new ApiClient(baseUrl);
  const result = await api.get<Record<string, unknown>>(
    `/api/v1/leaderboards/${board}?limit=${limit}`,
    accessToken,
  );

  if (!result.success) {
    return result;
  }

  return {
    success: true,
    status: result.status,
    data: normalizeLeaderboardResponse(result.data),
  };
}
