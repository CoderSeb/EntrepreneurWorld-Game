/** English UI strings (v1). Screens should import from here instead of hardcoding copy. */
export const en = {
  common: {
    loading: 'LOADING EMPIRE...',
    saveNow: 'Save now',
    syncCloud: 'SYNC CLOUD SAVE',
  },
  exec: {
    backend: 'BACKEND',
    connected: 'Connected',
    offline: 'Offline',
    localOnly: 'Local only',
  },
} as const;

export type TranslationKey = typeof en;
