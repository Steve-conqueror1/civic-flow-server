import { SafeUser, UserRow } from "./user";

export interface JwtAccessPayload {
  sub: string;
  role: UserRow["role"];
  departmentId: string | null;
  jti: string;
  iat?: number;
  exp?: number;
}

export interface JwtRefreshPayload {
  sub: string;
  jti: string;
  iat?: number;
  exp?: number;
}

export interface AuthTokenResult {
  user: SafeUser;
}

export interface MfaChallengeResult {
  mfaRequired: true;
  challengeToken: string;
}

// Augment Express Request to carry authenticated user
declare module "express-serve-static-core" {
  interface Request {
    user?: JwtAccessPayload;
  }
}
