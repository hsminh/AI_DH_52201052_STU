import { AbstractApiClient } from '@/shared/api/base.api';
import { LoginRequest, RegisterRequest, AuthResponse } from '../types';
import { User } from '@/shared/types';

export class AuthApi extends AbstractApiClient {
  static async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/accounts/login/', {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify(data),
    });
    this.setToken(response.access, response.refresh);
    return response;
  }

  static async userLogin(data: LoginRequest): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/accounts/user/login/', {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify(data),
    });
    this.setToken(response.access, response.refresh);
    return response;
  }

  static async consumerLogin(data: LoginRequest): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/accounts/consumer/login/', {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify(data),
    });
    this.setToken(response.access, response.refresh);
    return response;
  }

  static async register(data: RegisterRequest): Promise<User> {
    return this.request('/accounts/register/', {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify(data),
    });
  }

  static async getProfile(): Promise<User> {
    return this.request('/accounts/profile/', {
      method: 'GET',
      headers: await this.getHeaders(),
    });
  }

  static setToken(access: string, refresh: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
    }
  }

  static clearToken() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
  }

  static getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('access_token');
    }
    return null;
  }
}
