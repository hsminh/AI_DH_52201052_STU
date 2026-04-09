export enum AccountRole {
  CONSUMER = 'CONSUMER',
  USER = 'USER'
}

export interface User {
  id: number;
  username: string;
  email: string;
  role: AccountRole;
  profile?: any;
}
