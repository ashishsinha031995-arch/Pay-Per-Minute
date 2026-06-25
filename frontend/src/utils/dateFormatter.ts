export function formatDate(isoString: string): string {
  if (!isoString) return '';
  try {
    return new Date(isoString).toLocaleDateString();
  } catch {
    return isoString;
  }
}

export function formatTime(isoString: string): string {
  if (!isoString) return '';
  try {
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return isoString;
  }
}
