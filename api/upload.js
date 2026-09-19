import { put, del } from "@vercel/blob";
import { requireAuth } from "./_auth.js";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 4.5 * 1024 * 1024;

export const config = {
  api: { bodyParser: { sizeLimit: "6mb" } },
};

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return;

  if (req.method === "POST") {
    const { filename, contentType, dataBase64 } = req.body || {};
    if (!ALLOWED_TYPES.has(contentType)) {
      res.status(400).json({ error: "unsupported file type" });
      return;
    }
    if (typeof dataBase64 !== "string" || !dataBase64) {
      res.status(400).json({ error: "missing file data" });
      return;
    }
    const buffer = Buffer.from(dataBase64, "base64");
    if (buffer.length > MAX_BYTES) {
      res.status(400).json({ error: "file too large (max 4MB)" });
      return;
    }
    const safeName = (filename || "photo").toString().replace(/[^\w.\-]+/g, "-").slice(-80);
    const blob = await put(`gallery/${Date.now()}-${safeName}`, buffer, {
      access: "public",
      contentType,
    });
    res.status(200).json({ url: blob.url });
    return;
  }

  if (req.method === "DELETE") {
    const { url } = req.body || {};
    if (typeof url !== "string" || !url) {
      res.status(400).json({ error: "missing url" });
      return;
    }
    try {
      await del(url);
    } catch {
      // already gone / not a blob URL — ignore
    }
    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: "method not allowed" });
}
