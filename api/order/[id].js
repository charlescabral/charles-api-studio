import { createClient } from "@supabase/supabase-js";
import { handleCors } from "../../src/helpers/cors.js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { id } = req.query;

  try {
    const { data, error } = await supabase
      .from("charles-api-studio")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({ error: "Pedido não encontrado" });
      }
      throw error;
    }

    return res.json({
      success: true,
      data: data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

export default function (req, res) {
  return handleCors(req, res, handler);
}
