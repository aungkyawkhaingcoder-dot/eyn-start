import { getUserById, replaceRefreshToken, updateUser } from "../services/authservices";
import { issueTokens, unauthenticated, verifyRefreshToken } from "./tokens";

export async function authenticateRefreshToken(token: string | null) {
  if (!token) throw unauthenticated();
  const claims = verifyRefreshToken(token);
  const user = await getUserById(claims.id);
  if (!user || user.randomToken !== token || user.phone !== claims.phone) {
    throw unauthenticated();
  }
  return user;
}

type SessionUser = { id: number; phone: string; randomToken: string };

export async function startSession(user: { id: number; phone: string }) {
  const tokens = issueTokens(user);
  await updateUser(user.id, { randomToken: tokens.refreshToken, errorLoginCount: 0 });
  return tokens;
}

export async function rotateSession(user: SessionUser) {
  const tokens = issueTokens(user);
  if (!await replaceRefreshToken(user.id, user.randomToken, tokens.refreshToken)) {
    throw unauthenticated();
  }
  return tokens;
}
