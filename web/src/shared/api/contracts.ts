export interface AuthUser {
  id: string;
  email: string;
  display_name: string;
  locale: string;
  timezone: string;
}

export interface AuthPayload {
  user: AuthUser;
  access_token: string;
  refresh_token: string;
}
