// Client for the Cosmora Bank server (applications, admin, loans, portfolio).
export const serverUrl = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '');

export async function api(path, { token, body, form, method, signal } = {}) {
  const headers = {};
  if (token) headers.Authorization = 'Bearer ' + token;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  let response;
  try {
    response = await fetch(serverUrl + '/api' + path, {
      method: method || (body !== undefined || form ? 'POST' : 'GET'), headers, signal, credentials: 'omit',
      body: form || (body !== undefined ? JSON.stringify(body) : undefined),
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error('Could not reach the Cosmora server at ' + serverUrl + '. Start it with "npm start" in the server folder.');
  }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.error?.message || 'The server returned HTTP ' + response.status + '.');
    error.status = response.status;
    throw error;
  }
  return result;
}

// Opens an uploaded KYC document in a new tab (the request needs the token).
export async function openDocument(token, uid, docId) {
  const tab = window.open('', '_blank');
  try {
    const response = await fetch(`${serverUrl}/api/documents/${uid}/${docId}`, { headers: { Authorization: 'Bearer ' + token } });
    if (!response.ok) throw new Error('The document could not be opened.');
    const url = URL.createObjectURL(await response.blob());
    if (tab) tab.location.href = url; else window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (error) {
    tab?.close();
    throw error;
  }
}

export const rupeesInput = minor => (minor / 100).toFixed(2).replace(/\.00$/, '');
