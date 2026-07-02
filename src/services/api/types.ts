export type ApiErrorBody = {
  code: string;
  message: string;
};

export type AuthTokenResponse = {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
  playerId: string;
};

export type PlayerProfileResponse = {
  playerId: string;
  displayName: string;
  authProvider: string;
  status: string;
  createdAt: string;
  lastSeenAt: string;
};

export type CloudSaveResponse = {
  playerId: string;
  schemaVersion: number;
  economyVersion: number;
  clientVersion: string;
  payloadJson: string;
  checksum: string;
  updatedAt: string;
};

export type CloudSaveUploadRequest = {
  schemaVersion: number;
  economyVersion: number;
  clientVersion: string;
  payloadJson: string;
  checksum: string;
  updatedAt: string;
};

export type BootstrapConfigResponse = {
  economyVersion: number;
  clientMinVersion: string;
  featureFlags: Record<string, boolean>;
  remoteStrings: Record<string, string>;
};

export type EconomyConfigResponse = {
  version: number;
  payloadJson: string;
};

export type PurchaseEntitlementDto = {
  entitlementId: string;
  productId: string;
  expiresAt: string;
};

export type ClientEventRequest = {
  eventName: string;
  economyVersion: number;
  clientVersion: string;
  properties: Record<string, string | number | boolean>;
};

export type LeaderboardBoard = 'net_worth' | 'business_rank' | 'subsidiaries';

export type LeaderboardEntryDto = {
  rank: number;
  playerId: string;
  displayName: string;
  netWorthMinor: number;
  businessRank: number;
  subsidiaryCount: number;
  isCurrentPlayer: boolean;
};

export type LeaderboardResponse = {
  board: LeaderboardBoard;
  generatedAt: string;
  entries: LeaderboardEntryDto[];
  currentPlayer: LeaderboardEntryDto | null;
};
