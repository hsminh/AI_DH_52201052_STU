// Token keys cho từng loại người dùng
export const TOKEN_KEYS = {
  CONSUMER: {
    access:  'consumer_access_token',
    refresh: 'consumer_refresh_token',
  },
  USER: {
    access:  'user_access_token',
    refresh: 'user_refresh_token',
  },
} as const;

export type TokenRole = keyof typeof TOKEN_KEYS;

export abstract class AbstractApiClient {
  protected static BASE_URL = 'http://127.0.0.1:8000/api';

  /** Tự động xác định role dựa trên URL prefix hiện tại */
  static detectRole(): TokenRole {
    if (typeof window === 'undefined') return 'CONSUMER';
    return window.location.pathname.startsWith('/space') ? 'USER' : 'CONSUMER';
  }

  /** Lấy access token theo role */
  static getAccessToken(role?: TokenRole): string | null {
    if (typeof window === 'undefined') return null;
    const r = role ?? this.detectRole();
    return localStorage.getItem(TOKEN_KEYS[r].access);
  }

  /** Lưu token theo role */
  static setToken(access: string, refresh: string, role: TokenRole) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TOKEN_KEYS[role].access,  access);
    localStorage.setItem(TOKEN_KEYS[role].refresh, refresh);
  }

  /** Xoá token theo role */
  static clearToken(role: TokenRole) {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_KEYS[role].access);
    localStorage.removeItem(TOKEN_KEYS[role].refresh);
  }

  protected static async getHeaders(isMultipart = false, role?: TokenRole) {
    const token = this.getAccessToken(role);
    const headers: Record<string, string> = {};
    if (!isMultipart) headers['Content-Type'] = 'application/json';
    if (token)  headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }

  protected static async request<T>(
    endpoint: string,
    options: RequestInit,
    role?: TokenRole,
  ): Promise<T> {
    const response = await fetch(`${this.BASE_URL}${endpoint}`, options);

    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        const r = role ?? this.detectRole();
        this.clearToken(r);
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
    onChunk: (chunk: string) => void,
    role?: TokenRole,
  ): Promise<void> {
    const isMultipart = data instanceof FormData;
    const headers = await this.getHeaders(isMultipart, role);

    const response = await fetch(`${this.BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: isMultipart ? data : JSON.stringify(data),
    });

    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        const r = role ?? this.detectRole();
        this.clearToken(r);
      }
      throw new Error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
    }

    if (response.status === 403) {
      throw new Error('Không có quyền thực hiện thao tác này.');
    }

    if (!response.body) throw new Error('ReadableStream không khả dụng');

    const reader  = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      onChunk(decoder.decode(value, { stream: true }));
    }
  }
}
