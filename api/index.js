export default function handler(req, res) {
  return res.json({
    name: "Data Validation Studio",
    description: "Laboratório de APIs para validação de dados",
    version: "1.0.0",
    status: "online",
  });
}
