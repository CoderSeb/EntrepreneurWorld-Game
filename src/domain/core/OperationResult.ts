export type OperationResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; errorCode: string; errorMessage: string };

export function ok<T>(data: T): OperationResult<T> {
  return { success: true, data };
}

export function fail(errorCode: string, errorMessage: string): OperationResult<never> {
  return { success: false, errorCode, errorMessage };
}
