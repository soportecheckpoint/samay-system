export function formatRelativeTime(input?: string | number | Date | null): string {
  if (input === undefined || input === null) {
    return 'Sin registro';
  }

  const value = typeof input === 'string' || typeof input === 'number' ? new Date(input) : input;

  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    return 'Sin registro';
  }

  const diffMs = Date.now() - value.getTime();
  const diffSeconds = Math.round(diffMs / 1000);
  const absSeconds = Math.abs(diffSeconds);

  if (absSeconds < 5) {
    return 'Hace instantes';
  }

  if (absSeconds < 60) {
    return `Hace ${absSeconds}s`;
  }

  const diffMinutes = Math.round(diffSeconds / 60);
  if (Math.abs(diffMinutes) < 60) {
    return `Hace ${Math.abs(diffMinutes)}m`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return `Hace ${Math.abs(diffHours)}h`;
  }

  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 7) {
    return `Hace ${Math.abs(diffDays)}d`;
  }

  return value.toLocaleDateString();
}
