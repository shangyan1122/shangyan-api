import { Pool } from 'pg';

export async function initializeRecommendOfficerTables() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // 创建佣金流水记录表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS commission_records (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        officer_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        type VARCHAR(20) NOT NULL,
        amount INTEGER NOT NULL,
        rate INTEGER NOT NULL,
        order_id VARCHAR(36),
        remark TEXT,
        status VARCHAR(20) DEFAULT 'settled' NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      )
    `);

    await pool.query(`CREATE INDEX IF NOT EXISTS commission_records_officer_id_idx ON commission_records(officer_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS commission_records_user_id_idx ON commission_records(user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS commission_records_created_at_idx ON commission_records(created_at DESC)`);

    console.log('✅ commission_records 表初始化完成');

    // 创建推荐官提现记录表
    const officerWithdrawExists = await pool.query(`
      SELECT 1 FROM pg_tables
      WHERE schemaname = 'public' AND tablename = 'officer_withdraw_records'
    `);

    if (officerWithdrawExists.rows.length === 0) {
      await pool.query(`
        CREATE TABLE officer_withdraw_records (
          id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
          officer_id VARCHAR(36) NOT NULL,
          officer_openid VARCHAR(128) NOT NULL,
          amount INTEGER NOT NULL,
          fee INTEGER DEFAULT 0 NOT NULL,
          actual_amount INTEGER NOT NULL,
          status VARCHAR(20) DEFAULT 'pending' NOT NULL,
          account_type VARCHAR(20) NOT NULL,
          account_info TEXT NOT NULL,
          remark TEXT,
          reject_reason TEXT,
          processed_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE
        )
      `);

      await pool.query(`CREATE INDEX officer_withdraw_records_officer_id_idx ON officer_withdraw_records(officer_id)`);
      await pool.query(`CREATE INDEX officer_withdraw_records_created_at_idx ON officer_withdraw_records(created_at DESC)`);

      console.log('✅ officer_withdraw_records 表初始化完成');
    } else {
      console.log('✅ officer_withdraw_records 表已存在');
    }

    // 创建邀请码表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS officer_invite_codes (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        officer_id VARCHAR(36) NOT NULL,
        code VARCHAR(20) NOT NULL UNIQUE,
        status VARCHAR(20) DEFAULT 'active' NOT NULL,
        expire_date TIMESTAMP WITH TIME ZONE,
        total_uses INTEGER DEFAULT 0 NOT NULL,
        max_uses INTEGER DEFAULT 100 NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      )
    `);

    await pool.query(`CREATE INDEX IF NOT EXISTS officer_invite_codes_officer_id_idx ON officer_invite_codes(officer_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS officer_invite_codes_code_idx ON officer_invite_codes(code)`);

    console.log('✅ officer_invite_codes 表初始化完成');

    await pool.end();
  } catch (error) {
    console.error('❌ 推荐官表初始化失败:', error.message);
    await pool.end();
    throw error;
  }
}
