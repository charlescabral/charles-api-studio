import { createClient } from "@supabase/supabase-js";
import { handleCors } from "../src/helpers/cors.js";
import {
  validateRequest,
  validateRequiredFields,
} from "../src/helpers/security.js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const orderData = req.body;
  const requiredFields = ["payment_method", "magento_quote_id"];
  for (const field of requiredFields) {
    if (!orderData[field]) {
      return res.json({
        status: "erro",
        valido: false,
        mensagem: `Campo obrigatório ausente: ${field}`,
        atualizado: false,
      });
    }
  }

  const securityValidation = validateRequest(req);
  if (!securityValidation.valid) {
    return res.status(securityValidation.code).json({
      error: securityValidation.error,
    });
  }
  const paymentMethodObj = orderData.payment_method || {};
  const method = paymentMethodObj.method || "";
  const magentoQuoteId = orderData.magento_quote_id || "";

  const isValid = method === "cashondelivery";

  try {
    let existingData = null;

    if (isValid) {
      const { data: foundData, error: searchError } = await supabase
        .from("charles-api-studio")
        .select()
        .eq("quote_id", magentoQuoteId)
        .maybeSingle();

      if (searchError) throw searchError;
      existingData = foundData;

      const operation = existingData
        ? supabase
            .from("charles-api-studio")
            .update({ order: orderData })
            .eq("id", existingData.id)
        : supabase.from("charles-api-studio").insert({ order: orderData });

      const { data, error } = await operation.select();

      if (error) {
        return res.json({
          status: "erro",
          valido: false,
          mensagem: "Erro no banco de dados",
          error: error.message,
          atualizado: false,
        });
      }

      return res.json({
        status: "sucesso",
        valido: true,
        order_id: existingData?.order_id || null,
        id: existingData?.id || data[0].id,
        mensagem: "Método de pagamento aprovado",
        atualizado: Boolean(existingData),
      });
    }

    return res.json({
      status: "erro",
      valido: false,
      payment_method: method,
      mensagem: "Meio de pagamento não aceito",
    });
  } catch (error) {
    const errorResponse = {
      status: "erro",
      valido: false,
      mensagem: "Erro ao processar o pagamento",
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
