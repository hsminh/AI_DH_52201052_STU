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
      console.log('API - Token found, length:', token.length);
    } else {
      console.log('API - No token found in localStorage');
    }
    return headers;
  }

  protected static async request<T>(endpoint: string, options: RequestInit): Promise<T> {
    const response = await fetch(`${this.BASE_URL}${endpoint}`, options);

    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        // Don't redirect here, let the useAuth hook handle it
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

    console.log('API Stream - Endpoint:', endpoint);
    console.log('API Stream - Is Multipart:', isMultipart);
    console.log('API Stream - Headers:', headers);
    
    if (isMultipart && data instanceof FormData) {
      // Count FormData entries properly
      let entryCount = 0;
      for (let [key, value] of data.entries()) {
        entryCount++;
      }
      console.log('API Stream - FormData entries count:', entryCount);
      // Don't log FormData contents here as it can be large
    }

    const response = await fetch(`${this.BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: isMultipart ? data : JSON.stringify(data),
    });

    console.log('API Stream - Response status:', response.status);
    console.log('API Stream - Response headers:', Object.fromEntries(response.headers.entries()));

    if (response.status === 401) {
        console.log('API - 401 Unauthorized - Token invalid or expired');
        if (typeof window !== 'undefined') {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
        }
        throw new Error('Authentication failed. Please log in again.');
    }

    if (response.status === 403) {
        console.log('API - 403 Forbidden - Insufficient permissions');
        throw new Error('Access denied. You do not have permission to perform this action.');
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
