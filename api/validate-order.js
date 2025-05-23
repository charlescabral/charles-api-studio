import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const orderData = req.body;
  const { payment_method } = orderData;

  const validMethods = ["credit_card", "debit_card", "pix", "boleto", "paypal"];
  const isValid = validMethods.includes(payment_method);

  try {
    // Salvar o JSON completo no Supabase
    const { data, error } = await supabase
      .from("data-validation-studio")
      .insert([
        {
          order: orderData, // Salva o JSON inteiro
        },
      ])
      .select();

    if (error) throw error;

    return res.json({
      status: isValid ? "ok" : "erro",
      valido: isValid,
      payment_method: payment_method,
      mensagem: isValid
        ? "Meio de pagamento válido"
        : "Meio de pagamento não aceito",
      saved: true,
      id: data?.[0]?.id,
    });
  } catch (error) {
    return res.json({
      status: isValid ? "ok" : "erro",
      valido: isValid,
      payment_method: payment_method,
      mensagem: isValid
        ? "Meio de pagamento válido"
        : "Meio de pagamento não aceito",
      saved: false,
      error: "Erro ao salvar no banco",
    });
  }
}
