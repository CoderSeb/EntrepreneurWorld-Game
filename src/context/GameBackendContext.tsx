import { createContext, useContext } from 'react';
import { EconomyConfig } from '@/domain/config/EconomyConfig';
import { BackendStatus } from '@/services/backend/BackendBootstrapService';

export type GameBackendContextValue = {
  backendStatus: BackendStatus;
  config: EconomyConfig;
};

export const GameBackendContext = createContext<GameBackendContextValue | null>(null);

export function useGameBackend(): GameBackendContextValue {
  const ctx = useContext(GameBackendContext);
  if (!ctx) {
    throw new Error('useGameBackend must be used within GameProvider');
  }
  return ctx;
}
