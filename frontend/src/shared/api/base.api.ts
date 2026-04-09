export abstract class AbstractApiClient {
  protected static BASE_URL = 'http://127.0.0.1:8000/api';

  protected static async getHeaders(isMultipart = false) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const headers: any = {};
    if (!isMultipart) {
      headers['Content-Type'] = 'application/json';
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  protected static async request<T>(endpoint: string, options: RequestInit): Promise<T> {
    const response = await fetch(`${this.BASE_URL}${endpoint}`, options);

    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        window.location.href = '/login';
      }
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API Error: ${response.status}`);
    }

    return response.json();
  }

  protected static async stream(
    endpoint: string, 
    data: any, 
    onChunk: (chunk: string) => void
  ): Promise<void> {
    const isMultipart = data instanceof FormData;
    const headers = await this.getHeaders(isMultipart);

    const response = await fetch(`${this.BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: isMultipart ? data : JSON.stringify(data),
    });

    if (response.status === 401) {
        window.location.href = '/login';
        return;
    }

    if (!response.body) throw new Error('ReadableStream not available');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      onChunk(chunk);
    }
  }
}
