import { createClient } from "@supabase/supabase-js";
import { handleCors } from "../src/helpers/cors.js";
import { validateRequest } from "../src/helpers/security.js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { quote_id, entity_id } = req.body;

  // Validação dos campos obrigatórios
  if (!quote_id || !entity_id) {
    return res.json({
      status: "erro",
      valido: false,
      mensagem:
        "Campos obrigatórios ausentes: quote_id e entity_id são necessários",
      atualizado: false,
    });
  }

  const securityValidation = validateRequest(req);
  if (!securityValidation.valid) {
    return res.status(securityValidation.code).json({
      error: securityValidation.error,
    });
  }

  try {
    // Sempre buscar o registro pelo quote_id
    const { data: existingData, error: searchError } = await supabase
      .from("charles-api-studio")
      .select("id, order_id")
      .eq("quote_id", quote_id)
      .maybeSingle();

    if (searchError) throw searchError;

    // Se não encontrar o registro, retornar erro
    if (!existingData) {
      return res.json({
        status: "erro",
        valido: false,
        mensagem: "Registro não encontrado",
        atualizado: false,
      });
    }

    // Atualizar o order_id com o entity_id
    const { data: updatedData, error: updateError } = await supabase
      .from("charles-api-studio")
      .update({ order_id: entity_id })
      .eq("id", existingData.id)
      .select("id");

    if (updateError) {
      return res.json({
        status: "erro",
        valido: false,
        mensagem: "Erro ao atualizar o registro",
        error: updateError.message,
        atualizado: false,
      });
    }

    return res.json({
      status: "sucesso",
      valido: true,
      integration_id: updatedData[0].id,
      mensagem: "Order ID atualizado com sucesso",
      atualizado: true,
    });
  } catch (error) {
    const errorResponse = {
      status: "erro",
      valido: false,
      mensagem: "Erro ao processar a atualização",
      error: error.message || String(error),
      atualizado: false,
    };

    if (error.code) {
      errorResponse.mensagem = `Erro de banco de dados: ${error.code}`;
    }

    return res.json(errorResponse);
  }
}

export default function (req, res) {
  return handleCors(req, res, handler);
}
