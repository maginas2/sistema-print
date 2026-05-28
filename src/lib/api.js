const BASE = '';

function getToken() {
  return localStorage.getItem('print_token') ?? '';
}

function onSessionExpired() {
  localStorage.removeItem('print_token');
  localStorage.removeItem('print_usuario');
  window.dispatchEvent(new Event('session-expired'));
}

export async function apiFetch(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (res.status === 401) {
    onSessionExpired();
    throw new Error('session-expired');
  }
  return res;
}
