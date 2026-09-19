import { createSessionCookie } from "./_auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method not allowed" });
    return;
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    res.status(500).json({ error: "server not configured" });
    return;
  }

  const { password } = req.body || {};
  if (typeof password !== "string" || password !== adminPassword) {
    res.status(401).json({ error: "invalid password" });
    return;
  }

  res.setHeader("Set-Cookie", createSessionCookie());
  res.status(200).json({ ok: true });
}
