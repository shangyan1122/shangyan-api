import { Pool, PoolClient, QueryResult } from 'pg';
import { execSync } from 'child_process';

let pool: Pool | null = null;

/**
 * 查询缓存接口
 */
interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * 查询缓存配置
 */
interface QueryCacheConfig {
  enabled: boolean;
  maxSize: number;
  defaultTTL: number; // 默认缓存过期时间（毫秒）
}

/**
 * 查询缓存存储
 */
const queryCache = new Map<string, CacheEntry>();
const CACHE_STATS = {
  hits: 0,
  misses: 0,
  sets: 0,
  deletes: 0,
};

/**
 * 默认缓存配置
 */
const DEFAULT_CACHE_CONFIG: QueryCacheConfig = {
  enabled: true,
  maxSize: 1000,
  defaultTTL: 60000, // 默认 60 秒
};

/**
 * 缓存配置（可通过环境变量修改）
 */
const CACHE_CONFIG: QueryCacheConfig = {
  enabled: process.env.QUERY_CACHE_ENABLED !== 'false',
  maxSize: parseInt(process.env.QUERY_CACHE_MAX_SIZE || '1000', 10),
  defaultTTL: parseInt(process.env.QUERY_CACHE_DEFAULT_TTL || '60000', 10),
};

/**
 * 生成缓存键
 */
function generateCacheKey(sql: string, params?: any[]): string {
  const normalizedSql = sql.replace(/\s+/g, ' ').trim();
  const normalizedParams = params ? JSON.stringify(params) : '';
  return `${normalizedSql}|${normalizedParams}`;
}

/**
 * 获取缓存
 */
function getFromCache<T = any>(key: string): T | null {
  if (!CACHE_CONFIG.enabled) {
    return null;
  }

  const entry = queryCache.get(key);

  if (!entry) {
    CACHE_STATS.misses++;
    return null;
  }

  // 检查是否过期
  const now = Date.now();
  if (now - entry.timestamp > entry.ttl) {
    queryCache.delete(key);
    CACHE_STATS.misses++;
    return null;
  }

  CACHE_STATS.hits++;
  return entry.data as T;
}

/**
 * 设置缓存
 */
function setCache<T = any>(key: string, data: T, ttl?: number): void {
  if (!CACHE_CONFIG.enabled) {
    return;
  }

  // 检查缓存大小
  if (queryCache.size >= CACHE_CONFIG.maxSize) {
    // 删除最旧的缓存项
    const oldestKey = queryCache.keys().next().value;
    if (oldestKey) {
      queryCache.delete(oldestKey);
      CACHE_STATS.deletes++;
    }
  }

  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
    ttl: ttl || CACHE_CONFIG.defaultTTL,
  };

  queryCache.set(key, entry);
  CACHE_STATS.sets++;
}

/**
 * 清除缓存
 */
export function clearCache(pattern?: string): void {
  if (pattern) {
    // 按模式删除
    for (const key of queryCache.keys()) {
      if (key.includes(pattern)) {
        queryCache.delete(key);
        CACHE_STATS.deletes++;
      }
    }
  } else {
    // 清除所有缓存
    const count = queryCache.size;
    queryCache.clear();
    CACHE_STATS.deletes += count;
  }
}

/**
 * 获取缓存统计信息
 */
export function getCacheStats() {
  return {
    ...CACHE_STATS,
    size: queryCache.size,
    hitRate: CACHE_STATS.hits + CACHE_STATS.misses > 0
      ? (CACHE_STATS.hits / (CACHE_STATS.hits + CACHE_STATS.misses) * 100).toFixed(2) + '%'
      : '0%',
  };
}

/**
 * 连接池监控接口
 */
interface PoolStats {
  totalCount: number;
  idleCount: number;
  waitingCount: number;
  maxCount: number;
  timestamp: number;
}

/**
 * 连接池监控统计
 */
const poolStats: PoolStats[] = [];
const MAX_STATS_HISTORY = 100;

/**
 * 监控配置
 */
const MONITOR_CONFIG = {
  enabled: true,
  alertThreshold: 0.8, // 连接池使用率告警阈值（80%）
  logInterval: 60000, // 日志记录间隔（60秒）
  slowQueryThreshold: 5000, // 慢查询阈值（5秒）
};

/**
 * 记录连接池统计信息
 */
function recordPoolStats() {
  if (!pool || !MONITOR_CONFIG.enabled) {
    return;
  }

  const stats: PoolStats = {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
    maxCount: pool.options.max as number,
    timestamp: Date.now(),
  };

  // 添加到历史记录
  poolStats.push(stats);

  // 限制历史记录数量
  if (poolStats.length > MAX_STATS_HISTORY) {
    poolStats.shift();
  }

  // 检查是否达到告警阈值
  const usageRate = (stats.totalCount / stats.maxCount);
  if (usageRate >= MONITOR_CONFIG.alertThreshold) {
    console.warn(`[PoolMonitor] 连接池使用率告警: ${(usageRate * 100).toFixed(2)}% (${stats.totalCount}/${stats.maxCount})`);
    console.warn(`[PoolMonitor] 空闲连接: ${stats.idleCount}, 等待队列: ${stats.waitingCount}`);
  }
}

/**
 * 定期记录连接池统计信息
 */
setInterval(() => {
  recordPoolStats();
}, MONITOR_CONFIG.logInterval);

/**
 * 获取连接池统计信息
 */
export function getPoolStats(): PoolStats | null {
  if (!pool) {
    return null;
  }

  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
    maxCount: pool.options.max as number,
    timestamp: Date.now(),
  };
}

/**
 * 获取连接池历史统计信息
 */
export function getPoolStatsHistory(): PoolStats[] {
  return [...poolStats];
}

/**
 * 记录连接获取时间
 */
function logConnectionAcquire() {
  if (!MONITOR_CONFIG.enabled) return;
  console.log(`[PoolMonitor] 获取连接 - 总数: ${pool?.totalCount}, 空闲: ${pool?.idleCount}, 等待: ${pool?.waitingCount}`);
}

/**
 * 记录连接释放时间
 */
function logConnectionRelease() {
  if (!MONITOR_CONFIG.enabled) return;
  console.log(`[PoolMonitor] 释放连接 - 总数: ${pool?.totalCount}, 空闲: ${pool?.idleCount}, 等待: ${pool?.waitingCount}`);
}

/**
 * SQL 查询构建器
 * 用于简化 SQL 查询的编写
 */
export class SqlBuilder {
  private table: string = '';
  private columns: string[] = [];
  private values: any[] = [];
  private whereConditions: string[] = [];
  private whereValues: any[] = [];
  private type: 'insert' | 'update' | 'delete' | 'select' | 'batch_insert' | 'batch_update' = 'insert';
  private joins: string[] = [];
  private orderByClauses: string[] = [];
  private limitCount: number | null = null;
  private offsetCount: number | null = null;
  private groupByColumns: string[] = [];
  private havingConditions: string[] = [];
  private havingValues: any[] = [];
  private unions: { query: string; type: 'UNION' | 'UNION ALL' }[] = [];

  /**
   * 设置表名
   */
  from(table: string): this {
    this.table = table;
    return this;
  }

  /**
   * 设置插入操作
   */
  insert(data: Record<string, any>): this {
    this.type = 'insert';
    this.columns = Object.keys(data);
    this.values = Object.values(data);
    return this;
  }

  /**
   * 设置批量插入操作
   */
  batchInsert(dataArray: Record<string, any>[]): this {
    this.type = 'batch_insert';
    if (dataArray.length === 0) {
      this.columns = [];
      this.values = [];
      return this;
    }

    // 使用第一条数据确定列名
    this.columns = Object.keys(dataArray[0]);
    // 展平所有值
    this.values = dataArray.flatMap(data => this.columns.map(col => data[col]));
    return this;
  }

  /**
   * 设置更新操作
   */
  update(data: Record<string, any>): this {
    this.type = 'update';
    this.columns = Object.keys(data);
    this.values = Object.values(data);
    return this;
  }

  /**
   * 设置批量更新操作
   * 使用 CASE WHEN 语句实现批量更新
   */
  batchUpdate(
    dataArray: Record<string, any>[],
    keyColumn: string
  ): this {
    this.type = 'batch_update';
    if (dataArray.length === 0) {
      this.columns = [];
      this.values = [];
      return this;
    }

    // 第一条数据确定要更新的列（排除keyColumn）
    const excludeKeys = [keyColumn, 'created_at', 'updated_at'];
    this.columns = Object.keys(dataArray[0]).filter(key => !excludeKeys.includes(key));

    // 存储keyColumn和对应的值
    this.values = dataArray.map(data => ({
      [keyColumn]: data[keyColumn],
      updates: this.columns.reduce((acc, col) => {
        acc[col] = data[col];
        return acc;
      }, {} as Record<string, any>)
    }));

    return this;
  }

  /**
   * 设置删除操作
   */
  delete(): this {
    this.type = 'delete';
    return this;
  }

  /**
   * 设置查询操作
   */
  select(columns: string = '*'): this {
    this.type = 'select';
    this.columns = [columns];
    return this;
  }

  /**
   * 设置 WHERE 条件
   */
  where(conditions: Record<string, any>): this {
    const entries = Object.entries(conditions);
    this.whereConditions = entries.map(([key]) => `${key} = ?`);
    this.whereValues = entries.map(([, value]) => value);
    return this;
  }

  /**
   * 添加自定义 WHERE 条件
   */
  whereRaw(condition: string, values: any[] = []): this {
    this.whereConditions.push(condition);
    this.whereValues.push(...values);
    return this;
  }

  /**
   * 添加 JOIN 操作
   */
  join(table: string, condition: string, type: 'INNER' | 'LEFT' | 'RIGHT' = 'INNER'): this {
    this.joins.push(`${type} JOIN ${table} ON ${condition}`);
    return this;
  }

  /**
   * 添加 ORDER BY
   */
  orderBy(column: string, direction: 'ASC' | 'DESC' = 'ASC'): this {
    this.orderByClauses.push(`${column} ${direction}`);
    return this;
  }

  /**
   * 设置 LIMIT
   */
  limit(count: number): this {
    this.limitCount = count;
    return this;
  }

  /**
   * 设置 OFFSET
   */
  offset(count: number): this {
    this.offsetCount = count;
    return this;
  }

  /**
   * 添加 GROUP BY
   */
  groupBy(...columns: string[]): this {
    this.groupByColumns.push(...columns);
    return this;
  }

  /**
   * 添加 HAVING 条件
   */
  having(condition: string, values: any[] = []): this {
    this.havingConditions.push(condition);
    this.havingValues.push(...values);
    return this;
  }

  /**
   * 添加子查询（用于 IN、EXISTS 等）
   */
  subquery(subqueryBuilder: SqlBuilder, alias?: string): string {
    const { query, values } = subqueryBuilder.build();
    this.values.push(...values);
    const subqueryWithAlias = alias ? `(${query}) AS ${alias}` : `(${query})`;
    return subqueryWithAlias;
  }

  /**
   * 添加 UNION
   */
  union(subqueryBuilder: SqlBuilder, unionType: 'UNION' | 'UNION ALL' = 'UNION'): this {
    const { query, values } = subqueryBuilder.build();
    this.unions.push({ query, type: unionType });
    this.values.push(...values);
    return this;
  }

  /**
   * 构建 SQL 查询
   */
  build(): { query: string; values: any[] } {
    let allValues = [...this.values, ...this.whereValues, ...this.havingValues];
    let query = '';
    let paramIndex = 1;

    // 将 ? 替换为 $1, $2, $3...
    const replacePlaceholders = (sql: string): string => {
      return sql.replace(/\?/g, () => `$${paramIndex++}`);
    };

    switch (this.type) {
      case 'insert':
        const placeholders = this.columns.map(() => '?').join(', ');
        query = `INSERT INTO ${this.table} (${this.columns.join(', ')}) VALUES (${placeholders}) RETURNING *`;
        query = replacePlaceholders(query);
        break;

      case 'batch_insert':
        if (this.columns.length === 0) {
          query = '';
          break;
        }
        const rowPlaceholders = this.columns.map(() => '?').join(', ');
        const allPlaceholders = Array(this.values.length / this.columns.length)
          .fill(`(${rowPlaceholders})`)
          .join(', ');
        query = `INSERT INTO ${this.table} (${this.columns.join(', ')}) VALUES ${allPlaceholders} RETURNING *`;
        query = replacePlaceholders(query);
        break;

      case 'update':
        const setClause = this.columns.map(col => `${col} = ?`).join(', ');
        query = `UPDATE ${this.table} SET ${setClause}`;
        query = replacePlaceholders(query);

        if (this.whereConditions.length > 0) {
          const whereClause = this.whereConditions.join(' AND ');
          query += ` WHERE ${replacePlaceholders(whereClause)}`;
        }
        query += ' RETURNING *';
        break;

      case 'batch_update':
        if (this.columns.length === 0) {
          query = '';
          break;
        }

        // 使用 CASE WHEN 实现批量更新
        const updateValues = this.values as Array<{ [key: string]: any }>;
        const keyColumn = Object.keys(updateValues[0]).find(k => k !== 'updates')!;
        const keyValues = updateValues.map(v => v[keyColumn]);

        // 构建 SET 子句
        const setCases = this.columns.map(col => {
          const whenClauses = updateValues.map((v, idx) => {
            return `WHEN ${keyColumn} = $${paramIndex++} THEN $${paramIndex++}`;
          }).join(' ');
          return `${col} = CASE ${whenClauses} ELSE ${col} END`;
        }).join(', ');

        query = `UPDATE ${this.table} SET ${setCases}`;

        // 构建 IN 子句
        const inPlaceholders = keyValues.map(() => `$${paramIndex++}`).join(', ');
        query += ` WHERE ${keyColumn} IN (${inPlaceholders})`;

        // 收集所有值
        allValues = [];
        for (const v of updateValues) {
          allValues.push(v[keyColumn]);
          for (const col of this.columns) {
            allValues.push(v.updates[col]);
          }
        }
        allValues.push(...keyValues);

        query += ' RETURNING *';
        break;

      case 'delete':
        query = `DELETE FROM ${this.table}`;

        if (this.whereConditions.length > 0) {
          const whereClause = this.whereConditions.join(' AND ');
          query += ` WHERE ${replacePlaceholders(whereClause)}`;
        }
        query += ' RETURNING *';
        break;

      case 'select':
        query = `SELECT ${this.columns[0]} FROM ${this.table}`;

        // 添加 JOIN
        if (this.joins.length > 0) {
          query += ' ' + this.joins.join(' ');
        }

        // 添加 WHERE
        if (this.whereConditions.length > 0) {
          const whereClause = this.whereConditions.join(' AND ');
          query += ` WHERE ${replacePlaceholders(whereClause)}`;
        }

        // 添加 GROUP BY
        if (this.groupByColumns.length > 0) {
          query += ` GROUP BY ${this.groupByColumns.join(', ')}`;
        }

        // 添加 HAVING
        if (this.havingConditions.length > 0) {
          const havingClause = this.havingConditions.join(' AND ');
          query += ` HAVING ${replacePlaceholders(havingClause)}`;
        }

        // 添加 ORDER BY
        if (this.orderByClauses.length > 0) {
          query += ` ORDER BY ${this.orderByClauses.join(', ')}`;
        }

        // 添加 LIMIT
        if (this.limitCount !== null) {
          query += ` LIMIT ${this.limitCount}`;
        }

        // 添加 OFFSET
        if (this.offsetCount !== null) {
          query += ` OFFSET ${this.offsetCount}`;
        }

        break;

      default:
        throw new Error(`Unknown query type: ${this.type}`);
    }

    // 添加 UNION
    if (this.unions.length > 0) {
      for (const union of this.unions) {
        // 替换 UNION 查询中的占位符
        const unionQueryWithParams = union.query.replace(/\$[0-9]+/g, () => `$${paramIndex++}`);
        query += ` ${union.type} ${unionQueryWithParams}`;
      }
    }

    return { query, values: allValues };
  }
}

/**
 * 加载环境变量
 */
function loadEnv(): void {
  try {
    require('dotenv').config();
    if (process.env.COZE_SUPABASE_URL && process.env.COZE_SUPABASE_ANON_KEY) {
      return;
    }
  } catch {
    // dotenv not available
  }

  try {
    const pythonCode = `
import os
import sys
try:
    from coze_workload_identity import Client
    client = Client()
    env_vars = client.get_project_env_vars()
    client.close()
    for env_var in env_vars:
        print(f"{env_var.key}={env_var.value}")
except Exception as e:
    print(f"# Error: {e}", file=sys.stderr)
`;

    const output = execSync(`python3 -c '${pythonCode.replace(/'/g, "'\"'\"'")}'`, {
      encoding: 'utf-8',
      timeout: 10000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const lines = output.trim().split('\n');
    for (const line of lines) {
      if (line.startsWith('#')) continue;
      const eqIndex = line.indexOf('=');
      if (eqIndex > 0) {
        const key = line.substring(0, eqIndex);
        let value = line.substring(eqIndex + 1);
        if ((value.startsWith("'") && value.endsWith("'")) ||
            (value.startsWith('"') && value.endsWith('"'))) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  } catch {
    // Silently fail
  }
}

/**
 * 从 Supabase URL 解析数据库连接信息
 */
function parseDatabaseUrl(supabaseUrl: string): {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
} {
  try {
    // Supabase URL 格式: postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
    const url = new URL(supabaseUrl);

    return {
      host: url.hostname,
      port: parseInt(url.port) || 5432,
      database: url.pathname.slice(1), // 移除开头的 '/'
      user: url.username,
      password: url.password,
    };
  } catch (error) {
    throw new Error(`Invalid Supabase URL: ${supabaseUrl}`);
  }
}

/**
 * 获取 pg Pool 实例
 */
export function getPgPool(): Pool {
  if (pool) {
    return pool;
  }

  loadEnv();

  const pgDatabaseUrl = process.env.PGDATABASE_URL || process.env.DATABASE_URL;
  if (!pgDatabaseUrl) {
    throw new Error('PGDATABASE_URL or DATABASE_URL is not set');
  }

  const dbConfig = parseDatabaseUrl(pgDatabaseUrl);

  pool = new Pool({
    host: dbConfig.host,
    port: dbConfig.port,
    database: dbConfig.database,
    user: dbConfig.user,
    password: dbConfig.password,
    max: 20, // 最大连接数
    idleTimeoutMillis: 300000, // 空闲连接超时：5分钟
    connectionTimeoutMillis: 10000, // 连接超时：10秒
    statement_timeout: 30000, // 查询超时时间：30秒
  });

  // 监听连接错误（不要 exit，仅记录日志）
  pool.on('error', (err) => {
    console.error('[PoolMonitor] 连接池错误:', err.message);
    // 不再 process.exit(-1)，避免数据库临时不可用导致整个服务崩溃
  });

  // 监听连接获取
  pool.on('acquire', () => {
    logConnectionAcquire();
  });

  // 监听连接释放
  pool.on('release', () => {
    logConnectionRelease();
  });

  console.log('[PoolMonitor] 连接池已创建 - 最大连接数:', pool.options.max);

  return pool;
}

/**
 * 执行查询
 */
export async function query(text: string, params?: any[]): Promise<QueryResult<any>> {
  const pool = getPgPool();
  const start = Date.now();

  // 截断过长的查询日志
  const queryPreview = text.length > 200 ? text.substring(0, 200) + '...' : text;

  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;

    // 慢查询告警
    if (duration > MONITOR_CONFIG.slowQueryThreshold) {
      console.warn(`[SlowQuery] 查询耗时 ${duration}ms: ${queryPreview}`);
    } else {
      console.log(`[Query] 查询耗时 ${duration}ms: ${queryPreview}`);
    }

    return result;
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`[Query] 查询失败 (${duration}ms): ${queryPreview}`, error);
    throw error;
  }
}

/**
 * 带缓存的查询函数
 * 仅适用于 SELECT 查询
 *
 * @param text SQL 查询语句
 * @param params 查询参数
 * @param ttl 缓存过期时间（毫秒），默认使用配置中的默认值
 * @returns 查询结果
 */
export async function queryWithCache(text: string, params?: any[], ttl?: number): Promise<QueryResult<any>> {
  // 检查是否是 SELECT 查询
  if (!text.trim().toUpperCase().startsWith('SELECT')) {
    throw new Error('queryWithCache 只能用于 SELECT 查询');
  }

  const cacheKey = generateCacheKey(text, params);

  // 尝试从缓存获取
  const cachedData = getFromCache<QueryResult<any>>(cacheKey);
  if (cachedData) {
    console.log(`[Cache] 命中缓存: ${cacheKey.substring(0, 100)}...`);
    return cachedData;
  }

  // 执行查询
  const result = await query(text, params);

  // 缓存结果
  setCache(cacheKey, result, ttl);

  return result;
}

/**
 * 获取客户端（用于事务）
 */
export async function getClient(): Promise<PoolClient> {
  const pool = getPgPool();
  const start = Date.now();

  try {
    const client = await pool.connect();
    const duration = Date.now() - start;

    console.log(`[Client] 获取客户端耗时 ${duration}ms`);

    return client;
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`[Client] 获取客户端失败 (${duration}ms)`, error);
    throw error;
  }
}

/**
 * 关闭连接池
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
