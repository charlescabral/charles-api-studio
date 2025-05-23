export default function handler(req, res) {
  return res.json({
    name: "Data Validation Studio",
    description: "Um laboratório de APIs para validação de dados",
    version: "1.0.0",
    endpoints: [
      {
        path: "/api/validate-order",
        method: "POST",
        description: "Validação de meio de pagamento",
      },
    ],
    status: "online",
  });
}
