export const CompanyKinds = {
  HOLDING: 'holding',
  SUBSIDIARY: 'subsidiary',
} as const;

export type CompanyKind = (typeof CompanyKinds)[keyof typeof CompanyKinds];
