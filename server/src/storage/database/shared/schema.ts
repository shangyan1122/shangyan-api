import {
  pgTable,
  serial,
  timestamp,
  varchar,
  integer,
  text,
  boolean,
  jsonb,
  index,
  numeric,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// 系统健康检查表（Supabase内置，禁止删除）
export const healthCheck = pgTable('health_check', {
  id: serial().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow(),
});

// 商家账户表（主办方子账户）
export const merchantAccounts = pgTable(
  'merchant_accounts',
  {
    id: varchar('id', { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    openid: varchar('openid', { length: 128 }).notNull().unique(),
    merchantName: varchar('merchant_name', { length: 255 }), // 商户名称
    contactName: varchar('contact_name', { length: 100 }).notNull(), // 联系人姓名
    contactPhone: varchar('contact_phone', { length: 20 }).notNull(), // 联系电话
    businessLicenseUrl: text('business_license_url'), // 营业执照图片
    idCardFrontUrl: text('id_card_front_url'), // 身份证正面
    idCardBackUrl: text('id_card_back_url'), // 身份证反面
    bankAccountNo: varchar('bank_account_no', { length: 50 }), // 银行账号
    bankName: varchar('bank_name', { length: 100 }), // 开户银行
    bankBranch: varchar('bank_branch', { length: 200 }), // 开户支行
    subMchId: varchar('sub_mch_id', { length: 64 }), // 微信支付子商户号
    status: varchar('status', { length: 20 }).default('none').notNull(), // none/pending/approved/rejected
    reviewNote: text('review_note'), // 审核备注
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }),
  },
  (table) => [
    index('merchant_accounts_openid_idx').on(table.openid),
    index('merchant_accounts_status_idx').on(table.status),
  ]
);

// 宴会表
export const banquets = pgTable(
  'banquets',
  {
    id: varchar('id', { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    hostOpenid: varchar('host_openid', { length: 128 }).notNull(),
    type: varchar('type', { length: 20 }).notNull(), // 婚宴/回门/生日/寿宴/升学/乔迁/满月/开锁
    name: varchar('name', { length: 255 }).notNull(),
    eventTime: timestamp('event_time', { withTimezone: true, mode: 'string' }).notNull(),
    location: varchar('location', { length: 255 }).notNull(),
    photos: jsonb('photos'), // 照片URL数组
    coverImage: text('cover_image'), // 封面图
    aiWelcomePage: text('ai_welcome_page'), // AI生成的欢迎页内容
    aiThankPage: text('ai_thank_page'), // AI生成的感谢页内容
    returnRedPacket: integer('return_red_packet').default(0), // 回礼红包金额（分）
    returnGiftIds: jsonb('return_gift_ids'), // 回礼礼品IDs数组
    returnGiftConfig: jsonb('return_gift_config'), // 回礼配置（完整）
    status: varchar('status', { length: 20 }).default('draft').notNull(), // draft/active/ended
    qrCode: text('qr_code'), // 收款二维码
    // 商城礼品支付相关
    mallGiftPaid: boolean('mall_gift_paid').default(false).notNull(), // 商城礼品是否已支付
    mallGiftPayAmount: integer('mall_gift_pay_amount').default(0), // 商城礼品支付金额（分）
    mallGiftPayTime: timestamp('mall_gift_pay_time', { withTimezone: true, mode: 'string' }), // 支付时间
    mallGiftPayNo: varchar('mall_gift_pay_no', { length: 64 }), // 支付单号
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }),
  },
  (table) => [
    index('banquets_host_openid_idx').on(table.hostOpenid),
    index('banquets_status_idx').on(table.status),
    index('banquets_event_time_idx').on(table.eventTime),
  ]
);

// 随礼记录表
export const giftRecords = pgTable(
  'gift_records',
  {
    id: varchar('id', { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    banquetId: varchar('banquet_id', { length: 36 }).notNull(),
    guestOpenid: varchar('guest_openid', { length: 128 }).notNull(),
    guestName: varchar('guest_name', { length: 100 }).notNull(),
    amount: integer('amount').notNull(), // 随礼金额（分）
    blessing: text('blessing'), // 祝福语
    paymentStatus: varchar('payment_status', { length: 20 }).default('pending').notNull(), // pending/paid/failed
    returnGiftStatus: varchar('return_gift_status', { length: 20 }).default('none').notNull(), // none/eligible/claimed
    // 随礼直达主办方相关字段
    transferStatus: varchar('transfer_status', { length: 20 }).default('pending'), // pending/transferred/transfer_failed
    transferPaymentNo: varchar('transfer_payment_no', { length: 64 }), // 转账单号
    transferErrorMsg: text('transfer_error_msg'), // 转账失败原因
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }),
  },
  (table) => [
    index('gift_records_banquet_id_idx').on(table.banquetId),
    index('gift_records_guest_openid_idx').on(table.guestOpenid),
    index('gift_records_payment_status_idx').on(table.paymentStatus),
  ]
);

// 回礼记录表
export const returnGifts = pgTable(
  'return_gifts',
  {
    id: varchar('id', { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    giftRecordId: varchar('gift_record_id', { length: 36 }).notNull(),
    guestOpenid: varchar('guest_openid', { length: 128 }).notNull(),
    redPacketAmount: integer('red_packet_amount').default(0), // 回礼红包金额（分）
    giftIds: jsonb('gift_ids'), // 选择的礼品IDs数组
    status: varchar('status', { length: 20 }).default('pending').notNull(), // pending/claimed/recycled
    recipientName: varchar('recipient_name', { length: 100 }),
    recipientPhone: varchar('recipient_phone', { length: 20 }),
    recipientAddress: text('recipient_address'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    claimedAt: timestamp('claimed_at', { withTimezone: true, mode: 'string' }),
  },
  (table) => [
    index('return_gifts_gift_record_id_idx').on(table.giftRecordId),
    index('return_gifts_guest_openid_idx').on(table.guestOpenid),
    index('return_gifts_status_idx').on(table.status),
  ]
);

// 礼品表
export const gifts = pgTable(
  'gifts',
  {
    id: varchar('id', { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: varchar('name', { length: 255 }).notNull(),
    image: text('image').notNull(),
    marketPrice: integer('market_price').notNull(), // 市场价（分）
    costPrice: integer('cost_price').notNull(), // 成本价（分）
    stock: integer('stock').default(0).notNull(),
    status: varchar('status', { length: 20 }).default('active').notNull(), // active/inactive
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }),
  },
  (table) => [index('gifts_status_idx').on(table.status)]
);

// 渠道合作表
export const partners = pgTable(
  'partners',
  {
    id: varchar('id', { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    openid: varchar('openid', { length: 128 }).notNull().unique(),
    type: varchar('type', { length: 50 }).notNull(), // 婚庆/酒店/司仪
    name: varchar('name', { length: 100 }).notNull(),
    phone: varchar('phone', { length: 20 }).notNull(),
    referralCode: varchar('referral_code', { length: 50 }).notNull().unique(), // 专属推广码
    totalCommission: integer('total_commission').default(0).notNull(), // 总佣金（分）
    availableCommission: integer('available_commission').default(0).notNull(), // 可提现佣金（分）
    status: varchar('status', { length: 20 }).default('active').notNull(), // active/inactive
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }),
  },
  (table) => [
    index('partners_openid_idx').on(table.openid),
    index('partners_referral_code_idx').on(table.referralCode),
  ]
);

// 渠道合作申请表
export const channelPartners = pgTable(
  'channel_partners',
  {
    id: varchar('id', { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    companyName: varchar('company_name', { length: 255 }).notNull(),
    contactName: varchar('contact_name', { length: 100 }).notNull(),
    phone: varchar('phone', { length: 20 }).notNull(),
    email: varchar('email', { length: 255 }),
    businessType: varchar('business_type', { length: 50 }), // 婚庆公司/酒店场地/礼品供应商等
    description: text('description'),
    status: varchar('status', { length: 20 }).default('pending').notNull(), // pending/approved/rejected
    reviewerNote: text('reviewer_note'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true, mode: 'string' }),
  },
  (table) => [
    index('channel_partners_phone_idx').on(table.phone),
    index('channel_partners_status_idx').on(table.status),
  ]
);

// 商城商品表
export const giftProducts = pgTable(
  'gift_products',
  {
    id: varchar('id', { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    price: integer('price').notNull(), // 售价（分）
    originalPrice: integer('original_price').notNull(), // 原价（分）
    image: text('image').notNull(),
    images: jsonb('images'), // 图片数组
    category: varchar('category', { length: 50 }).notNull(), // 喜糖礼盒/伴手礼/红包等
    stock: integer('stock').default(0).notNull(),
    sales: integer('sales').default(0).notNull(),
    status: varchar('status', { length: 20 }).default('active').notNull(), // active/inactive
    // 1688一键代发字段
    giftType: varchar('gift_type', { length: 20 }).default('onsite'), // onsite/delivery
    alibaba1688ProductId: varchar('alibaba_1688_product_id', { length: 100 }),
    alibaba1688SkuId: varchar('alibaba_1688_sku_id', { length: 100 }),
    alibaba1688Url: text('alibaba_1688_url'),
    supplyCostPrice: integer('supply_cost_price').default(0), // 供货成本价（分）
    alibaba1688SyncStatus: varchar('alibaba_1688_sync_status', { length: 20 }).default('none'), // none/pending/synced/failed
    alibaba1688SyncedAt: timestamp('alibaba_1688_synced_at', {
      withTimezone: true,
      mode: 'string',
    }),
    source: varchar('source', { length: 20 }).default('manual'), // manual/alibaba_1688
    exchangeServiceFeeRate: numeric('exchange_service_fee_rate', {
      precision: 5,
      scale: 4,
    }).default('0.0500'), // 置换服务费率，默认5%
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }),
  },
  (table) => [
    index('gift_products_category_idx').on(table.category),
    index('gift_products_status_idx').on(table.status),
    index('gift_products_gift_type_idx').on(table.giftType),
    index('gift_products_source_idx').on(table.source),
  ]
);

// 购物车表
export const cartItems = pgTable(
  'cart_items',
  {
    id: varchar('id', { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userOpenid: varchar('user_openid', { length: 128 }).notNull(),
    productId: varchar('product_id', { length: 36 }).notNull(),
    quantity: integer('quantity').default(1).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('cart_items_user_openid_idx').on(table.userOpenid),
    index('cart_items_product_id_idx').on(table.productId),
  ]
);

// 用户表
export const users = pgTable(
  'users',
  {
    id: varchar('id', { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    openid: varchar('openid', { length: 128 }).notNull().unique(),
    nickname: varchar('nickname', { length: 100 }),
    avatar: text('avatar'),
    phone: varchar('phone', { length: 20 }),
    referrerId: varchar('referrer_id', { length: 36 }), // 邀请人ID
    isVip: boolean('is_vip').default(false).notNull(),
    vipExpireDate: timestamp('vip_expire_date', { withTimezone: true, mode: 'string' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }),
  },
  (table) => [
    index('users_openid_idx').on(table.openid),
    index('users_referrer_id_idx').on(table.referrerId),
  ]
);

// 邀请码表
export const referralCodes = pgTable(
  'referral_codes',
  {
    id: varchar('id', { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar('user_id', { length: 36 }).notNull(),
    code: varchar('code', { length: 20 }).notNull().unique(),
    usedCount: integer('used_count').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('referral_codes_user_id_idx').on(table.userId),
    index('referral_codes_code_idx').on(table.code),
  ]
);

// 邀请关系表
export const referralBinds = pgTable(
  'referral_binds',
  {
    id: varchar('id', { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    referrerId: varchar('referrer_id', { length: 36 }).notNull(), // 邀请人ID
    inviteeId: varchar('invitee_id', { length: 36 }).notNull(), // 被邀请人ID
    commissionRate: integer('commission_rate').default(10).notNull(), // 分佣比例（百分比，默认10%）
    commissionExpireDate: timestamp('commission_expire_date', {
      withTimezone: true,
      mode: 'string',
    }).notNull(),
    totalCommission: integer('total_commission').default(0).notNull(), // 累计佣金（分）
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('referral_binds_referrer_id_idx').on(table.referrerId),
    index('referral_binds_invitee_id_idx').on(table.inviteeId),
  ]
);

// 佣金记录表
export const commissions = pgTable(
  'commissions',
  {
    id: varchar('id', { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar('user_id', { length: 36 }).notNull(), // 获得佣金的用户ID
    inviteeId: varchar('invitee_id', { length: 36 }).notNull(), // 被邀请人ID
    paymentId: varchar('payment_id', { length: 36 }), // 关联的支付ID
    amount: integer('amount').notNull(), // 佣金金额（分）
    status: varchar('status', { length: 20 }).default('available').notNull(), // available/withdrawn/expired
    expireDate: timestamp('expire_date', { withTimezone: true, mode: 'string' }).notNull(),
    withdrawnAt: timestamp('withdrawn_at', { withTimezone: true, mode: 'string' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('commissions_user_id_idx').on(table.userId),
    index('commissions_invitee_id_idx').on(table.inviteeId),
    index('commissions_status_idx').on(table.status),
  ]
);

// 提现记录表
export const withdrawRecords = pgTable(
  'withdraw_records',
  {
    id: varchar('id', { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar('user_id', { length: 36 }).notNull(),
    amount: integer('amount').notNull(), // 提现金额（分）
    status: varchar('status', { length: 20 }).default('pending').notNull(), // pending/processing/success/failed
    bankName: varchar('bank_name', { length: 100 }),
    bankAccount: varchar('bank_account', { length: 50 }),
    realName: varchar('real_name', { length: 50 }),
    failReason: text('fail_reason'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true, mode: 'string' }),
  },
  (table) => [
    index('withdraw_records_user_id_idx').on(table.userId),
    index('withdraw_records_status_idx').on(table.status),
  ]
);

// 宴会推荐官表
export const recommendOfficers = pgTable(
  'recommend_officers',
  {
    id: varchar('id', { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    openid: varchar('openid', { length: 128 }).notNull().unique(),
    realName: varchar('real_name', { length: 50 }).notNull(),
    idCard: varchar('id_card', { length: 18 }),
    phone: varchar('phone', { length: 20 }),
    status: varchar('status', { length: 20 }).default('active').notNull(), // active/inactive/banned
    vipCommissionRate: integer('vip_commission_rate').default(30).notNull(), // VIP佣金比例，默认30%
    mallCommissionRate: integer('mall_commission_rate').default(10).notNull(), // 商城佣金比例，默认10%
    totalCommission: integer('total_commission').default(0).notNull(), // 累计佣金（分）
    availableCommission: integer('available_commission').default(0).notNull(), // 可提现佣金（分）
    totalInvitees: integer('total_invitees').default(0).notNull(), // 累计邀请人数
    remark: text('remark'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }),
  },
  (table) => [
    index('recommend_officers_openid_idx').on(table.openid),
    index('recommend_officers_status_idx').on(table.status),
  ]
);

// 推荐官邀请关系表
export const officerReferrals = pgTable(
  'officer_referrals',
  {
    id: varchar('id', { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    officerId: varchar('officer_id', { length: 36 }).notNull(),
    userId: varchar('user_id', { length: 36 }).notNull(),
    commissionExpireDate: timestamp('commission_expire_date', {
      withTimezone: true,
      mode: 'string',
    }).notNull(),
    totalCommission: integer('total_commission').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('officer_referrals_officer_id_idx').on(table.officerId),
    index('officer_referrals_user_id_idx').on(table.userId),
  ]
);

// 推荐官佣金记录表
export const officerCommissions = pgTable(
  'officer_commissions',
  {
    id: varchar('id', { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    officerId: varchar('officer_id', { length: 36 }).notNull(),
    userId: varchar('user_id', { length: 36 }).notNull(),
    paymentId: varchar('payment_id', { length: 36 }),
    amount: integer('amount').notNull(),
    commissionRate: integer('commission_rate').notNull(),
    commissionType: varchar('commission_type', { length: 20 }).notNull(), // vip/mall/gift
    status: varchar('status', { length: 20 }).default('available').notNull(),
    expireDate: timestamp('expire_date', { withTimezone: true, mode: 'string' }),
    withdrawnAt: timestamp('withdrawn_at', { withTimezone: true, mode: 'string' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('officer_commissions_officer_id_idx').on(table.officerId),
    index('officer_commissions_user_id_idx').on(table.userId),
    index('officer_commissions_status_idx').on(table.status),
  ]
);
