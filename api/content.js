import { redis } from "./_store.js";
import { requireAuth } from "./_auth.js";

const CONTENT_KEY = "rb:content";

function str(v, max, fallback = "") {
  if (typeof v !== "string") return fallback;
  return v.trim().slice(0, max);
}

function slugify(name, index) {
  const base = (name || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return base || `category-${index}`;
}

function sanitizeItem(item) {
  if (!item || typeof item !== "object") return null;
  const name = str(item.name, 120);
  if (!name) return null;
  return {
    name,
    description: str(item.description, 500),
    price: str(item.price, 20),
  };
}

function sanitizeCategory(cat, index) {
  if (!cat || typeof cat !== "object") return null;
  const name = str(cat.name, 60);
  if (!name) return null;
  const items = Array.isArray(cat.items)
    ? cat.items.map(sanitizeItem).filter(Boolean).slice(0, 80)
    : [];
  return {
    id: str(cat.id, 60) || slugify(name, index),
    name,
    items,
  };
}

function sanitizeGalleryItem(g) {
  if (!g || typeof g !== "object") return null;
  const url = str(g.url, 500);
  if (!url) return null;
  return { url, alt: str(g.alt, 300) };
}

function sanitizeHourRow(h) {
  if (!h || typeof h !== "object") return null;
  const label = str(h.label, 60);
  if (!label) return null;
  return { label, time: str(h.time, 60) };
}

function sanitizeContent(input) {
  const c = input && typeof input === "object" ? input : {};
  const hero = c.hero || {};
  const story = c.story || {};
  const contact = c.contact || {};
  const footer = c.footer || {};
  const seo = c.seo || {};

  return {
    hero: {
      eyebrow: str(hero.eyebrow, 200),
      title: str(hero.title, 200),
      subtitle: str(hero.subtitle, 300),
    },
    story: {
      paragraphs: Array.isArray(story.paragraphs)
        ? story.paragraphs.map((p) => str(p, 2000)).filter(Boolean).slice(0, 6)
        : [],
    },
    gallery: Array.isArray(c.gallery)
      ? c.gallery.map(sanitizeGalleryItem).filter(Boolean).slice(0, 60)
      : [],
    menu: {
      categories: Array.isArray(c.menu?.categories)
        ? c.menu.categories.map(sanitizeCategory).filter(Boolean).slice(0, 24)
        : [],
    },
    contact: {
      address: str(contact.address, 300),
      addressNote: str(contact.addressNote, 300),
      phone: str(contact.phone, 40),
      hours: Array.isArray(contact.hours)
        ? contact.hours.map(sanitizeHourRow).filter(Boolean).slice(0, 14)
        : [],
      ontopoUrl: str(contact.ontopoUrl, 300),
      mapsUrl: str(contact.mapsUrl, 300),
    },
    footer: {
      instagramUrl: str(footer.instagramUrl, 300),
      facebookUrl: str(footer.facebookUrl, 300),
      rating: str(footer.rating, 10),
      reviewCount: str(footer.reviewCount, 20),
      priceRange: str(footer.priceRange, 60),
    },
    seo: {
      title: str(seo.title, 200),
      description: str(seo.description, 400),
    },
  };
}

export default async function handler(req, res) {
  if (!redis) {
    res.status(500).json({ error: "storage not configured" });
    return;
  }

  if (req.method === "GET") {
    const content = await redis.get(CONTENT_KEY);
    res.status(200).json(content || null);
    return;
  }

  if (req.method === "POST") {
    if (!requireAuth(req, res)) return;
    const sanitized = sanitizeContent(req.body);
    await redis.set(CONTENT_KEY, sanitized);
    res.status(200).json(sanitized);
    return;
  }

  res.status(405).json({ error: "method not allowed" });
}
