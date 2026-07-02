export type PurchaseState = {
  entitlements: string[];
  lastValidatedAtUnix: number;
};

export function createPurchaseState(): PurchaseState {
  return { entitlements: [], lastValidatedAtUnix: 0 };
}

export function duplicatePurchaseState(state: PurchaseState): PurchaseState {
  return {
    entitlements: [...state.entitlements],
    lastValidatedAtUnix: state.lastValidatedAtUnix,
  };
}
