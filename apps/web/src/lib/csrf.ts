export function getCsrfToken(cookieName = 'XSRF-TOKEN'): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(?:^|; )' + cookieName.replace(/([.$?*|{}()\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

export function withCsrfHeaders(init?: RequestInit): RequestInit {
  const token = getCsrfToken();
  const headers = new Headers(init?.headers || {});
  if (token) headers.set('x-csrf-token', token);
  return { ...init, headers };
}

