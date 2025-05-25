import { createClient } from "@supabase/supabase-js";
import { handleCors } from "../src/helpers/cors.js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function handler(req, res) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, message: "Método não permitido", retry: false });
  }

  const { quote_id, entity_id } = req.body;

  try {
    const { data: existingData, error: searchError } = await supabase
      .from("charles-api-studio")
      .select("id")
      .eq("quote_id", quote_id)
      .single();

    if (searchError) {
      return res.json({ success: false, message: "Erro" });
    }

    const { error: updateError } = await supabase
      .from("charles-api-studio")
      .update({ entity_id: entity_id })
      .eq("id", existingData.id);

    if (updateError) {
      return res.json({ success: false, message: "Erro" });
    }

    return res.json({
      success: true,
      message: "Sucesso",
      integration_id: existingData.id,
    });
  } catch (error) {
    return res.json({ success: false, message: "Erro" });
  }
}

export default function (req, res) {
  return handleCors(req, res, handler);
}
