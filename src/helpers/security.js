// helpers/security.js

// Cache para rate limiting e blacklist
const requestCounts = new Map();
const blacklist = new Set();

// Configurações
const RATE_LIMIT = {
  windowMs: 60 * 1000, // 1 minuto
  maxRequests: 10,
};

const BLOCKED_AGENTS = [
  "curl",
  "wget",
  "python-requests",
  "bot",
  "crawler",
  "spider",
];
const MAX_PAYLOAD_SIZE = 10000; // 10KB

export function validateRequest(req, options = {}) {
  const config = { ...RATE_LIMIT, ...options };
  const ip = req.headers["x-forwarded-for"]?.split(",")[0] || "unknown";

  // 1. Blacklist check
  if (blacklist.has(ip)) {
    return { valid: false, error: "IP blocked", code: 403 };
  }

  // 2. Rate limiting
  const now = Date.now();

  if (!requestCounts.has(ip)) {
    requestCounts.set(ip, []);
  }

  const requests = requestCounts.get(ip);
  const validRequests = requests.filter((time) => now - time < config.windowMs);

  if (validRequests.length >= config.maxRequests) {
    blacklist.add(ip);
    return {
      valid: false,
      error: "Rate limit exceeded - IP blocked",
      code: 429,
    };
  }

  validRequests.push(now);
  requestCounts.set(ip, validRequests);

  // 3. User-Agent validation
  const userAgent = req.headers["user-agent"];

  if (
    !userAgent ||
    BLOCKED_AGENTS.some((agent) => userAgent.toLowerCase().includes(agent))
  ) {
    return { valid: false, error: "Invalid user agent", code: 403 };
  }

  // 4. Payload size
  const jsonString = JSON.stringify(req.body);
  if (jsonString.length > MAX_PAYLOAD_SIZE) {
    return { valid: false, error: "Payload too large", code: 413 };
  }

  // 5. Honeypot
  if (req.body.website || req.body.url) {
    blacklist.add(ip);
    return { valid: false, error: "Bot detected", code: 403 };
  }

  return { valid: true };
}

export function validateRequiredFields(body, requiredFields = []) {
  for (const field of requiredFields) {
    if (!body[field]) {
      return { valid: false, error: `Missing ${field}`, code: 400 };
    }
  }
  return { valid: true };
}

export function validateOrigin(req, allowedOrigins = []) {
  const origin = req.headers.origin;

  if (allowedOrigins.length > 0 && origin && !allowedOrigins.includes(origin)) {
    return { valid: false, error: "Origin not allowed", code: 403 };
  }

  return { valid: true };
}

export function addToBlacklist(ip) {
  blacklist.add(ip);
}

export function removeFromBlacklist(ip) {
  blacklist.delete(ip);
}

export function getBlacklist() {
  return Array.from(blacklist);
}

export function clearRateLimit(ip) {
  requestCounts.delete(ip);
}
