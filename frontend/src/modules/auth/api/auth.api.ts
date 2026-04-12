import { AbstractApiClient, TokenRole } from '@/shared/api/base.api';
import { LoginRequest, RegisterRequest, AuthResponse } from '../types';
import { User } from '@/shared/types';

export class AuthApi extends AbstractApiClient {

  /** Đăng nhập Consumer → lưu consumer_access_token */
  static async consumerLogin(data: LoginRequest): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/accounts/consumer/login/', {
      method: 'POST',
      headers: await this.getHeaders(false, 'CONSUMER'),
      body: JSON.stringify(data),
    });
    this.setToken(response.access, response.refresh, 'CONSUMER');
    return response;
  }

  /** Đăng nhập User/Space → lưu user_access_token */
  static async userLogin(data: LoginRequest): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/accounts/user/login/', {
      method: 'POST',
      headers: await this.getHeaders(false, 'USER'),
      body: JSON.stringify(data),
    });
    this.setToken(response.access, response.refresh, 'USER');
    return response;
  }

  /** Đăng ký tài khoản mới */
  static async register(data: RegisterRequest): Promise<User> {
    return this.request('/accounts/register/', {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify(data),
    });
  }

  /** Lấy thông tin người dùng hiện tại (tự phát hiện role từ URL) */
  static async getProfile(role?: TokenRole): Promise<User> {
    return this.request(
      '/accounts/profile/',
      { method: 'GET', headers: await this.getHeaders(false, role) },
      role,
    );
  }

  /** Đăng xuất theo role */
  static logout(role: TokenRole) {
    this.clearToken(role);
  }
}
