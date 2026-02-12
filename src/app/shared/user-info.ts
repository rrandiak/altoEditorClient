export enum UserRole {
  EDITOR = 'EDITOR',
  CURATOR = 'CURATOR',
}

export interface CurrentUser {
  id: number;
  username: string;
  roles: UserRole[];
  isCurator?: boolean;
}

export interface UserInfo {
  id: number;
  username: string;
  kramerius: boolean;
  engine: boolean;
  enabled: boolean;
}

export interface UserInfoSearchRequest {
  isKramerius?: boolean;
  isEngine?: boolean;
  isEnabled?: boolean;
  page?: number;
  size?: number;
}
