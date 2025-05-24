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

  const securityValidation = validateRequest(req);
  if (!securityValidation.valid) {
    return res.status(securityValidation.code).json({
      error: securityValidation.error,
    });
  }

  const fieldsValidation = validateRequiredFields(req.body, ["payment_method"]);
  if (!fieldsValidation.valid) {
    return res.status(fieldsValidation.code).json({
      error: fieldsValidation.error,
    });
  }

  const orderData = req.body;
  const paymentMethodObj = orderData.payment_method || {};
  const method = paymentMethodObj.method || "";
  const magentoQuoteId = orderData.magento_quote_id || "";

  const isValid = method === "cashondelivery";

  try {
    let savedData = null;
    let saveError = null;
    let isUpdate = false;

    if (isValid) {
      const { data: existingData, error: searchError } = await supabase
        .from("charles-api-studio")
        .select()
        .eq("quote_id", magentoQuoteId)
        .maybeSingle();

      if (searchError) throw searchError;

      if (existingData) {
        isUpdate = true;
        const { data, error } = await supabase
          .from("charles-api-studio")
          .update({
            order: orderData,
          })
          .eq("id", existingData.id)
          .select();

        savedData = data;
        saveError = error;

        if (error) throw error;

        return res.json({
          status: "sucesso",
          valido: true,
          order_id: existingData.order_id,
          id: existingData.id,
          mensagem: "Método de pagamento aprovado",
          atualizado: true,
        });
      } else {
        const { data, error } = await supabase
          .from("charles-api-studio")
          .insert([
            {
              order: orderData,
              quote_id: magentoQuoteId,
            },
          ])
          .select();

        savedData = data;
        saveError = error;

        if (error) throw error;

        if (savedData && savedData.length > 0) {
          const recordId = savedData[0].id;

          return res.json({
            status: "sucesso",
            valido: true,
            order_id: null,
            id: recordId,
            mensagem: "Método de pagamento aprovado",
          });
        }
      }
    }

    return res.json({
      status: "erro",
      valido: false,
      payment_method: method,
      mensagem: "Meio de pagamento não aceito",
    });
  } catch (error) {
    return res.json({
      status: "erro",
      valido: false,
      payment_method: method,
      mensagem: "Erro ao processar o pagamento",
      error: error.message || String(error),
    });
  }
}

export default function (req, res) {
  return handleCors(req, res, handler);
}
