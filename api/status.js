export default function handler(req, res) {
  return res.json({
    message: "API funcionando!",
    method: req.method,
    timestamp: new Date().toISOString(),
  });
}
