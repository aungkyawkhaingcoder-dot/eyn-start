import { issueTokens, TokenPair, unauthenticated, verifyRefreshToken, matchesRefreshIdentity } from "../tokens";
import { RefreshCodec } from "./crypto";

export interface RefreshUser { id: number; phone: string | null; email?: string | null; randomToken: string }
export interface RefreshRepository {
  getUserById(id: number): Promise<RefreshUser | null>;
  replaceRefreshToken(id: number, previous: string, replacement: string): Promise<boolean>;
}
export interface ResultStore {
  get(key: string): Promise<string | null>;
  putIfAbsent(key: string, value: string, ttlMs: number): Promise<boolean>;
}
export interface BrowserSession { user: RefreshUser; tokens?: TokenPair }
interface Candidate { tokens: TokenPair; expiresAt: number }

// Both strategies use this DB policy. A prepared pair is saved BEFORE the CAS,
// so a retried worker can recover the exact pair after a crash following commit.
export function createSharedRotation(
  db: RefreshRepository,
  store: ResultStore,
  codec: RefreshCodec,
  graceMs: number,
  now = Date.now,
) {
  function resultKey(token: string) { return `pair-${codec.id(token)}`; }

  async function readCandidate(token: string): Promise<Candidate | null> {
    const stored = await store.get(resultKey(token));
    if (!stored) return null;
    const candidate = codec.open<Candidate>(stored);
    return candidate.expiresAt > now() ? candidate : null;
  }

  async function findUser(token: string) {
    const claims = verifyRefreshToken(token);
    const user = await db.getUserById(claims.id);
    if (!user || !matchesRefreshIdentity(user, claims)) throw unauthenticated();
    return user;
  }

  // Strict sessions need no Redis read. Stale cookies may use only the exact
  // short-lived successor, and only while that successor is still current in DB.
  async function authenticate(token: string): Promise<BrowserSession> {
    const user = await findUser(token);
    if (user.randomToken === token) return { user };
    const candidate = await readCandidate(token);
    const current = await findUser(token);
    if (!candidate || candidate.expiresAt <= now() ||
        current.randomToken !== candidate.tokens.refreshToken) throw unauthenticated();
    return { user: current, tokens: candidate.tokens };
  }

  async function execute(token: string): Promise<void> {
    let candidate = await readCandidate(token);
    if (!candidate) {
      const user = await findUser(token);
      if (user.randomToken !== token) throw unauthenticated();
      const prepared: Candidate = {
        tokens: issueTokens(user), expiresAt: now() + graceMs,
      };
      await store.putIfAbsent(resultKey(token), codec.seal(prepared), graceMs);
      candidate = await readCandidate(token);
    }
    if (!candidate) throw unauthenticated();

    const user = await findUser(token);
    if (user.randomToken === token) {
      await db.replaceRefreshToken(user.id, token, candidate.tokens.refreshToken);
    }
    // A failed CAS might mean another worker committed this same candidate.
    // Logout, login replacement or a different successor must still fail.
    const current = await findUser(token);
    if (candidate.expiresAt <= now() || current.randomToken !== candidate.tokens.refreshToken) {
      throw unauthenticated();
    }
  }
  return { authenticate, execute };
}

export type SharedRotation = ReturnType<typeof createSharedRotation>;
