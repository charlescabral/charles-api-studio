const requestCounts = new Map();
const blacklist = new Set();

// Configuração padrão do rate limit
const DEFAULT_RATE_LIMIT = {
  windowMs: 60 * 1000, // 1 minuto
  maxRequests: 300, // máximo de requisições
  blockOnExceed: true, // bloquear IP quando exceder
  blockDuration: 60 * 60 * 1000, // duração do bloqueio (1 hora)
};

const BLOCKED_AGENTS = [
  "curl",
  "wget",
  "python-requests",
  "bot",
  "crawler",
  "spider",
];

const MAX_PAYLOAD_SIZE = 10000;

// Armazena quando cada IP foi bloqueado
const blockedIPs = new Map();

export function validateRequest(req, options = {}) {
  const config = { ...DEFAULT_RATE_LIMIT, ...options };
  const ip = req.headers["x-forwarded-for"]?.split(",")[0] || "unknown";

  // Verifica se o IP está na blacklist permanente
  if (blacklist.has(ip)) {
    return { valid: false, error: "IP permanently blocked", code: 403 };
  }

  // Verifica se o IP está temporariamente bloqueado
  if (blockedIPs.has(ip)) {
    const blockedTime = blockedIPs.get(ip);
    const now = Date.now();

    if (now - blockedTime < config.blockDuration) {
      const remainingTime = Math.ceil(
        (config.blockDuration - (now - blockedTime)) / 1000
      );
      return {
        valid: false,
        error: `IP temporarily blocked. Try again in ${remainingTime} seconds`,
        code: 429,
      };
    } else {
      // Remove o bloqueio temporário se expirou
      blockedIPs.delete(ip);
      requestCounts.delete(ip); // Limpa o histórico de requisições
    }
  }

  const now = Date.now();

  if (!requestCounts.has(ip)) {
    requestCounts.set(ip, []);
  }

  const requests = requestCounts.get(ip);
  const validRequests = requests.filter((time) => now - time < config.windowMs);

  if (validRequests.length >= config.maxRequests) {
    if (config.blockOnExceed) {
      // Bloqueia temporariamente
      blockedIPs.set(ip, now);
      return {
        valid: false,
        error: `Rate limit exceeded (${config.maxRequests} requests per ${
          config.windowMs / 1000
        }s) - IP blocked for ${config.blockDuration / 1000}s`,
        code: 429,
      };
    } else {
      // Apenas rejeita a requisição sem bloquear
      return {
        valid: false,
        error: `Rate limit exceeded (${config.maxRequests} requests per ${
          config.windowMs / 1000
        }s)`,
        code: 429,
      };
    }
  }

  validRequests.push(now);
  requestCounts.set(ip, validRequests);

  const userAgent = req.headers["user-agent"];

  if (
    !userAgent ||
    BLOCKED_AGENTS.some((agent) => userAgent.toLowerCase().includes(agent))
  ) {
    return { valid: false, error: "Invalid user agent", code: 403 };
  }

  const jsonString = JSON.stringify(req.body);
  if (jsonString.length > MAX_PAYLOAD_SIZE) {
    return { valid: false, error: "Payload too large", code: 413 };
  }

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

// Adiciona IP à blacklist permanente
export function addToBlacklist(ip) {
  blacklist.add(ip);
  blockedIPs.delete(ip); // Remove do bloqueio temporário se existir
}

// Remove IP da blacklist permanente
export function removeFromBlacklist(ip) {
  blacklist.delete(ip);
}

// Remove IP do bloqueio temporário
export function unblockIP(ip) {
  blockedIPs.delete(ip);
  requestCounts.delete(ip);
}

// Obtém lista de IPs permanentemente bloqueados
export function getBlacklist() {
  return Array.from(blacklist);
}

// Obtém lista de IPs temporariamente bloqueados
export function getTemporaryBlocks() {
  const now = Date.now();
  const blocks = [];

  for (const [ip, blockedTime] of blockedIPs.entries()) {
    const remainingTime = Math.max(
      0,
      DEFAULT_RATE_LIMIT.blockDuration - (now - blockedTime)
    );
    if (remainingTime > 0) {
      blocks.push({
        ip,
        blockedAt: new Date(blockedTime),
        remainingSeconds: Math.ceil(remainingTime / 1000),
      });
    }
  }

  return blocks;
}

// Limpa histórico de requisições de um IP
export function clearRateLimit(ip) {
  requestCounts.delete(ip);
}

// Limpa bloqueios temporários expirados
export function cleanupExpiredBlocks() {
  const now = Date.now();
  for (const [ip, blockedTime] of blockedIPs.entries()) {
    if (now - blockedTime >= DEFAULT_RATE_LIMIT.blockDuration) {
      blockedIPs.delete(ip);
      requestCounts.delete(ip);
    }
  }
}
