import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "rb_session";
const SESSION_DAYS = 14;

function base64url(input) {
  return Buffer.from(input).toString("base64url");
}

function sign(payload) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createSessionCookie() {
  const exp = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = base64url(JSON.stringify({ exp }));
  const sig = sign(payload);
  const value = `${payload}.${sig}`;
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  return `${COOKIE_NAME}=${value}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    out[key] = val;
  }
  return out;
}

export function isAuthenticated(req) {
  try {
    const cookies = parseCookies(req.headers.cookie);
    const value = cookies[COOKIE_NAME];
    if (!value) return false;
    const [payload, sig] = value.split(".");
    if (!payload || !sig) return false;
    const expected = sign(payload);
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
    const { exp } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return typeof exp === "number" && exp > Date.now();
  } catch {
    return false;
  }
}

export function requireAuth(req, res) {
  if (!isAuthenticated(req)) {
    res.status(401).json({ error: "unauthorized" });
    return false;
  }
  return true;
}
