import "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    error?: 'RefreshAccessTokenError';
    user?: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
} 