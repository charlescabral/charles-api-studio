export default function handler(req, res) {
  return res.json({
    name: "Charles API Studio",
    description: "Laboratório de teste de APIs",
    version: "1.0.0",
    status: "online",
  });
}
