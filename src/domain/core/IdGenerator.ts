let sequence = 0;

export function newId(prefix = 'id'): string {
  sequence += 1;
  return `${prefix}-${Date.now()}-${sequence}`;
}
