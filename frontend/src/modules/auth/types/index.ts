import { User } from '@/shared/types';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest extends LoginRequest {
  email: string;
  role: string;
}

export interface AuthResponse {
  access: string;
  refresh: string;
  user?: User;
}
