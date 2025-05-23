import { validatePaymentMethod } from "./../utils/index.js";

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { payment_method } = req.body;

  const isValid = validatePaymentMethod(payment_method);

  return res.json({
    status: isValid ? "ok" : "erro",
    valido: isValid,
    payment_method: payment_method,
    mensagem: isValid
      ? "Meio de pagamento válido"
      : "Meio de pagamento não aceito",
  });
}
