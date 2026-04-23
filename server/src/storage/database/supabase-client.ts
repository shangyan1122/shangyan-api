import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface SupabaseCredentials {
  url: string;
  anonKey: string;
  serviceKey?: string;
}

function getSupabaseCredentials(): SupabaseCredentials {
  // 优先使用标准 SUPABASE_ 变量，fallback 到 COZE_ 前缀变量
  const url =
    process.env.SUPABASE_URL ||
    process.env.COZE_SUPABASE_URL;

  const anonKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.COZE_SUPABASE_ANON_KEY;

  const serviceKey =
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.COZE_SUPABASE_SERVICE_KEY;

  if (!url) {
    throw new Error('SUPABASE_URL is not set');
  }
  if (!anonKey) {
    throw new Error('SUPABASE_ANON_KEY is not set');
  }

  return { url, anonKey, serviceKey };
}

/**
 * 获取普通 Supabase 客户端（使用 anon key）
 */
function getSupabaseClient(token?: string): SupabaseClient {
  const { url, anonKey } = getSupabaseCredentials();

  if (token) {
    return createClient(url, anonKey, {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
      db: {
        timeout: 60000,
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return createClient(url, anonKey, {
    db: {
      timeout: 60000,
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * 获取管理员 Supabase 客户端（使用 service_role key）
 * 用于 Storage 上传等需要绕过 RLS 的操作
 */
function getSupabaseAdminClient(): SupabaseClient {
  const { url, serviceKey, anonKey } = getSupabaseCredentials();
  // 如果有 service_role key 使用它，否则用 anon key
  const key = serviceKey || anonKey;

  return createClient(url, key, {
    db: {
      timeout: 60000,
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export { getSupabaseCredentials, getSupabaseClient, getSupabaseAdminClient };
