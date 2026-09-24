/**
 * Validates whether a given string is a syntactically valid HTTP/HTTPS URL.
 */
export function isValidUrl(urlString: string): boolean {
  if (!urlString || typeof urlString !== 'string') {
    return false;
  }
  try {
    const parsed = new URL(urlString.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
