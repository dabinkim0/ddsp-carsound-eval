import { createClient } from "@supabase/supabase-js";

let client;

export function getSupabaseAdmin() {
  if (client) {
    return client;
  }

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured.");
  }

  client = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  return client;
}

export async function requireSingle(query) {
  const { data, error } = await query.single();
  if (error) {
    throw error;
  }
  return data;
}

export async function requireMaybeSingle(query) {
  const { data, error } = await query.maybeSingle();
  if (error) {
    throw error;
  }
  return data;
}
