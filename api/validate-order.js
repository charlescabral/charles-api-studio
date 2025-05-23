import { createClient } from "@supabase/supabase-js";
import {
  validateRequest,
  validateRequiredFields,
} from "../src/helpers/security.js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  // ✅ CONFIGURAR CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With"
  );

  // ✅ HANDLE PREFLIGHT OPTIONS
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  // Validação de segurança
  const securityValidation = validateRequest(req);
  if (!securityValidation.valid) {
    return res.status(securityValidation.code).json({
      error: securityValidation.error,
    });
  }

  const orderData = req.body;

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
      status: "ok",
      mensagem: "Dados salvos com sucesso",
      saved: true,
      id: data?.[0]?.id,
    });
  } catch (error) {
    return res.json({
      status: "erro",
      mensagem: "Erro ao salvar dados",
      saved: false,
      error: error,
    });
  }
}
