const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export async function request(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = 'An error occurred';
    try {
      const data = await response.json();
      errorMsg = data.error || errorMsg;
    } catch (e) {
      // JSON parsing failed
    }
    throw new Error(errorMsg);
  }

  // Handle spreadsheet downloads (Excel binary streams)
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('sheet')) {
    return response.blob();
  }

  try {
    return await response.json();
  } catch (e) {
    return null;
  }
}

export const api = {
  get: (endpoint: string) => request(endpoint, { method: 'GET' }),
  post: (endpoint: string, body: any) => request(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint: string, body: any) => request(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (endpoint: string) => request(endpoint, { method: 'DELETE' }),
  downloadExcel: async (endpoint: string, filename: string) => {
    try {
      const blob = (await request(endpoint, { method: 'GET' })) as unknown as Blob;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download Excel file:', err);
      alert('Error exporting Excel sheet: ' + (err instanceof Error ? err.message : err));
    }
  }
};
