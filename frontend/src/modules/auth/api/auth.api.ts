import { AbstractApiClient, TokenRole, TOKEN_KEYS } from '@/shared/api/base.api';
import { LoginRequest, RegisterRequest, AuthResponse } from '../types';
import { User } from '@/shared/types';

export class AuthApi extends AbstractApiClient {

  static async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/accounts/login/', {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify(data),
    });
    
    // Lưu tạm vào CONSUMER để lấy profile
    this.setToken(response.access, response.refresh, 'CONSUMER');
    
    try {
      const profile = await this.getProfile('CONSUMER');
      if (profile.role === 'USER') {
        this.setToken(response.access, response.refresh, 'USER');
        // Xoá CONSUMER token nếu thực sự là USER
        localStorage.removeItem(TOKEN_KEYS.CONSUMER.access);
        localStorage.removeItem(TOKEN_KEYS.CONSUMER.refresh);
      }
    } catch (err) {
      // Bỏ qua lỗi lấy profile, giữ lại token đã lưu
    }
    
    return response;
  }

  static async consumerLogin(data: LoginRequest): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/accounts/consumer/login/', {
      method: 'POST',
      headers: await this.getHeaders(false, 'CONSUMER'),
      body: JSON.stringify(data),
    });
    this.setToken(response.access, response.refresh, 'CONSUMER');
    return response;
  }

  static async userLogin(data: LoginRequest): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/accounts/user/login/', {
      method: 'POST',
      headers: await this.getHeaders(false, 'USER'),
      body: JSON.stringify(data),
    });
    this.setToken(response.access, response.refresh, 'USER');
    return response;
  }

  static async register(data: RegisterRequest): Promise<User> {
    return this.request('/accounts/register/', {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify(data),
    });
  }

  static async getProfile(role?: TokenRole): Promise<User> {
    return this.request(
      '/accounts/profile/',
      { method: 'GET', headers: await this.getHeaders(false, role) },
      role,
    );
  }

  static logout(role: TokenRole) {
    this.clearToken(role);
  }
}
