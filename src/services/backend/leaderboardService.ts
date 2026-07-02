import { ApiClient, ApiResult } from '@/services/api/ApiClient';
import { LeaderboardBoard, LeaderboardResponse } from '@/services/api/types';
import { getApiBaseUrl } from '@/config/backendConfig';

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
  return api.get<LeaderboardResponse>(
    `/api/v1/leaderboards/${board}?limit=${limit}`,
    accessToken,
  );
}
