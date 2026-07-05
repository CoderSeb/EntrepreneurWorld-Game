/** Compact duration for activity effects and UI (not wall-clock locale). */
export function formatDurationSeconds(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  if (seconds === 0) {
    return '0s';
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0 && minutes === 0 && remainingSeconds === 0) {
    return `${hours}h`;
  }
  if (hours > 0) {
    const parts = [`${hours}h`];
    if (minutes > 0) {
      parts.push(`${minutes}m`);
    }
    if (remainingSeconds > 0) {
      parts.push(`${remainingSeconds}s`);
    }
    return parts.join(' ');
  }
  if (minutes > 0 && remainingSeconds === 0) {
    return `${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${remainingSeconds}s`;
}
