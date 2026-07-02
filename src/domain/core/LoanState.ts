export type LoanState = {
  id: string;
  productId: string;
  principalMinor: number;
  remainingMinor: number;
  interestRateHourly: number;
  dueAtUnix: number;
  takenAtUnix: number;
};

export function duplicateLoan(loan: LoanState): LoanState {
  return { ...loan };
}
