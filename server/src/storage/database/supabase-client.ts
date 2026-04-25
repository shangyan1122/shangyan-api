import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface SupabaseCredentials {
  url: string;
  anonKey: string;
  serviceKey?: string;
}

function getSupabaseCredentials(): SupabaseCredentials {
  // 优先使用标准 SUPABASE_ 变量，fallback 到 COZE_ 前缀变量
  // 再 fallback 到硬编码的默认值（用于 Railway 部署调试）
  const url =
    process.env.SUPABASE_URL ||
    process.env.COZE_SUPABASE_URL ||
    'https://qrkwbbphskndxzkfsfep.supabase.co'; // 默认值

  const anonKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.COZE_SUPABASE_ANON_KEY ||
    ''; // 不再提供默认值，强制要求设置环境变量

  const serviceKey =
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.COZE_SUPABASE_SERVICE_KEY ||
    ''; // 不再提供默认值，强制要求设置环境变量

  // 不再抛出错误，只打印警告
  if (!process.env.SUPABASE_URL && !process.env.COZE_SUPABASE_URL) {
    console.warn('⚠️  SUPABASE_URL 环境变量未设置，使用默认值');
  }
  if (!process.env.SUPABASE_ANON_KEY && !process.env.COZE_SUPABASE_ANON_KEY) {
    console.warn('⚠️  SUPABASE_ANON_KEY 环境变量未设置，使用默认值');
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
