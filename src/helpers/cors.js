export function validateRequest(req) {
  const userAgent = req.headers["user-agent"] || "";

  // User-Agents permitidos para navegadores
  const browserUserAgents = ["Mozilla", "Chrome", "Safari", "Firefox", "Edge"];

  // User-Agents permitidos para servidores/APIs
  const serverUserAgents = [
    "curl",
    "Magento",
    "PHP",
    "GuzzleHttp",
    "PostmanRuntime",
  ];

  const isValidBrowser = browserUserAgents.some((ua) => userAgent.includes(ua));
  const isValidServer = serverUserAgents.some((ua) => userAgent.includes(ua));

  if (!isValidBrowser && !isValidServer) {
    return {
      valid: false,
      code: 403,
      error: "Invalid user agent",
    };
  }

  return { valid: true };
}
