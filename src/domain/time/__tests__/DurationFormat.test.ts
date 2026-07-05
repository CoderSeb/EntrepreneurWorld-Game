import { formatDurationSeconds } from '@/domain/time/DurationFormat';

describe('formatDurationSeconds', () => {
  it('uses whole hours only when duration is an exact number of hours', () => {
    expect(formatDurationSeconds(3600)).toBe('1h');
    expect(formatDurationSeconds(7200)).toBe('2h');
  });

  it('shows minutes when duration is not an exact hour', () => {
    expect(formatDurationSeconds(1800)).toBe('30m');
    expect(formatDurationSeconds(5400)).toBe('1h 30m');
  });

  it('shows seconds when needed', () => {
    expect(formatDurationSeconds(90)).toBe('1m 30s');
    expect(formatDurationSeconds(45)).toBe('45s');
  });
});
