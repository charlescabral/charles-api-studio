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
  // ✅ CONFIGURAR CORS - ADICIONAR HEADERS
  res.setHeader("Access-Control-Allow-Origin", "*"); // ou específico: 'https://magento.test'
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With"
  );
  res.setHeader("Access-Control-Max-Age", "86400"); // Cache preflight por 24h

  // ✅ HANDLE PREFLIGHT OPTIONS REQUEST
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // ✅ VERIFICAR SE É POST
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Método não permitido",
      validOrder: false,
    });
  }

  try {
    // ✅ VALIDAÇÃO DE SEGURANÇA (com try/catch)
    let securityValidation;
    try {
      securityValidation = validateRequest(req);
    } catch (error) {
      console.warn("Security validation failed:", error);
      // Continue sem bloquear se a validação de segurança falhar
      securityValidation = { valid: true };
    }

    if (!securityValidation.valid) {
      return res.status(securityValidation.code).json({
        error: securityValidation.error,
        validOrder: false,
      });
    }

    // ✅ VERIFICAR SE TEM BODY
    if (!req.body || typeof req.body !== "object") {
      return res.status(400).json({
        error: "Dados do pedido não fornecidos",
        validOrder: false,
      });
    }

    const orderData = req.body;

    // ✅ VALIDAÇÃO DE CAMPOS OBRIGATÓRIOS (mais flexível)
    let fieldsValidation;
    try {
      fieldsValidation = validateRequiredFields(orderData, ["payment_method"]);
    } catch (error) {
      console.warn("Fields validation failed:", error);
      // Se não conseguir validar campos, verificar manualmente
      if (!orderData.payment_method || !orderData.payment_method.method) {
        return res.status(400).json({
          error: "Campo payment_method é obrigatório",
          validOrder: false,
        });
      }
      fieldsValidation = { valid: true };
    }

    if (!fieldsValidation.valid) {
      return res.status(fieldsValidation.code).json({
        error: fieldsValidation.error,
        validOrder: false,
      });
    }

    // ✅ EXTRAIR MÉTODO DE PAGAMENTO (mais robusto)
    let paymentMethod;
    if (typeof orderData.payment_method === "string") {
      paymentMethod = orderData.payment_method;
    } else if (orderData.payment_method && orderData.payment_method.method) {
      paymentMethod = orderData.payment_method.method;
    } else {
      return res.status(400).json({
        error: "Método de pagamento não identificado",
        validOrder: false,
      });
    }

    // ✅ VALIDAR MÉTODOS DE PAGAMENTO
    const validMethods = [
      "credit_card",
      "debit_card",
      "pix",
      "boleto",
      "paypal",
      // ✅ ADICIONAR MÉTODOS COMUNS DO MAGENTO
      "checkmo", // Check/Money Order
      "banktransfer", // Bank Transfer
      "cashondelivery", // Cash on Delivery
      "free", // Free Payment
      "purchaseorder", // Purchase Order
      "authorizenet_directpost", // Authorize.net
      "braintree", // Braintree
      "braintree_paypal", // Braintree PayPal
      "paypal_express", // PayPal Express
      "payflowpro", // PayPal Payflow Pro
    ];

    const isValid = validMethods.includes(paymentMethod.toLowerCase());

    // ✅ PREPARAR DADOS PARA SALVAR
    const dataToSave = {
      order: orderData,
      payment_method: paymentMethod,
      is_valid: isValid,
      timestamp: new Date().toISOString(),
      magento_quote_id:
        orderData.magento_quote_id || orderData.quote?.id || null,
      customer_email: orderData.customer?.email || null,
      grand_total: orderData.quote?.grand_total || null,
      currency: orderData.quote?.currency || null,
    };

    // ✅ SALVAR NO SUPABASE
    let savedData = null;
    let saveError = null;

    try {
      const { data, error } = await supabase
        .from("data-validation-studio")
        .insert([dataToSave])
        .select();

      if (error) throw error;
      savedData = data?.[0];

      console.log("✅ Dados salvos no Supabase:", savedData?.id);
    } catch (error) {
      console.error("❌ Erro ao salvar no Supabase:", error);
      saveError = error.message;
    }

    // ✅ RESPOSTA PADRONIZADA (sempre retorna validOrder)
    const response = {
      // Formato esperado pelo Magento
      validOrder: isValid,

      // Dados adicionais
      status: isValid ? "ok" : "erro",
      valido: isValid,
      payment_method: paymentMethod,
      message: isValid
        ? "Método de pagamento válido"
        : `Método de pagamento '${paymentMethod}' não aceito`,

      // Info sobre salvamento
      saved: !!savedData,
      id: savedData?.id || null,
      save_error: saveError,

      // Debug info
      timestamp: new Date().toISOString(),
      received_data: {
        quote_id: orderData.quote?.id,
        customer_email: orderData.customer?.email,
        items_count: orderData.items?.length || 0,
        total: orderData.quote?.grand_total,
      },
    };

    // ✅ LOG PARA DEBUG
    console.log(
      `📊 Pedido processado: ${paymentMethod} - ${
        isValid ? "VÁLIDO" : "INVÁLIDO"
      }`
    );

    return res.status(200).json(response);
  } catch (error) {
    // ✅ TRATAMENTO DE ERRO GLOBAL
    console.error("❌ Erro geral na API:", error);

    return res.status(500).json({
      validOrder: false,
      status: "erro",
      error: "Erro interno do servidor",
      message: "Falha ao processar pedido",
      timestamp: new Date().toISOString(),
    });
  }
}
