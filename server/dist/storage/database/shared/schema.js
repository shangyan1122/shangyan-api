"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.officerCommissions = exports.officerReferrals = exports.recommendOfficers = exports.withdrawRecords = exports.commissions = exports.referralBinds = exports.referralCodes = exports.users = exports.cartItems = exports.giftProducts = exports.channelPartners = exports.partners = exports.gifts = exports.returnGifts = exports.giftRecords = exports.banquets = exports.merchantAccounts = exports.healthCheck = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
exports.healthCheck = (0, pg_core_1.pgTable)('health_check', {
    id: (0, pg_core_1.serial)().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true, mode: 'string' }).defaultNow(),
});
exports.merchantAccounts = (0, pg_core_1.pgTable)('merchant_accounts', {
    id: (0, pg_core_1.varchar)('id', { length: 36 })
        .primaryKey()
        .default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    openid: (0, pg_core_1.varchar)('openid', { length: 128 }).notNull().unique(),
    merchantName: (0, pg_core_1.varchar)('merchant_name', { length: 255 }),
    contactName: (0, pg_core_1.varchar)('contact_name', { length: 100 }).notNull(),
    contactPhone: (0, pg_core_1.varchar)('contact_phone', { length: 20 }).notNull(),
    businessLicenseUrl: (0, pg_core_1.text)('business_license_url'),
    idCardFrontUrl: (0, pg_core_1.text)('id_card_front_url'),
    idCardBackUrl: (0, pg_core_1.text)('id_card_back_url'),
    bankAccountNo: (0, pg_core_1.varchar)('bank_account_no', { length: 50 }),
    bankName: (0, pg_core_1.varchar)('bank_name', { length: 100 }),
    bankBranch: (0, pg_core_1.varchar)('bank_branch', { length: 200 }),
    subMchId: (0, pg_core_1.varchar)('sub_mch_id', { length: 64 }),
    status: (0, pg_core_1.varchar)('status', { length: 20 }).default('none').notNull(),
    reviewNote: (0, pg_core_1.text)('review_note'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true, mode: 'string' })
        .defaultNow()
        .notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true, mode: 'string' }),
}, (table) => [
    (0, pg_core_1.index)('merchant_accounts_openid_idx').on(table.openid),
    (0, pg_core_1.index)('merchant_accounts_status_idx').on(table.status),
]);
exports.banquets = (0, pg_core_1.pgTable)('banquets', {
    id: (0, pg_core_1.varchar)('id', { length: 36 })
        .primaryKey()
        .default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    hostOpenid: (0, pg_core_1.varchar)('host_openid', { length: 128 }).notNull(),
    type: (0, pg_core_1.varchar)('type', { length: 20 }).notNull(),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    eventTime: (0, pg_core_1.timestamp)('event_time', { withTimezone: true, mode: 'string' }).notNull(),
    location: (0, pg_core_1.varchar)('location', { length: 255 }).notNull(),
    photos: (0, pg_core_1.jsonb)('photos'),
    coverImage: (0, pg_core_1.text)('cover_image'),
    aiWelcomePage: (0, pg_core_1.text)('ai_welcome_page'),
    aiThankPage: (0, pg_core_1.text)('ai_thank_page'),
    returnRedPacket: (0, pg_core_1.integer)('return_red_packet').default(0),
    returnGiftIds: (0, pg_core_1.jsonb)('return_gift_ids'),
    returnGiftConfig: (0, pg_core_1.jsonb)('return_gift_config'),
    status: (0, pg_core_1.varchar)('status', { length: 20 }).default('draft').notNull(),
    qrCode: (0, pg_core_1.text)('qr_code'),
    mallGiftPaid: (0, pg_core_1.boolean)('mall_gift_paid').default(false).notNull(),
    mallGiftPayAmount: (0, pg_core_1.integer)('mall_gift_pay_amount').default(0),
    mallGiftPayTime: (0, pg_core_1.timestamp)('mall_gift_pay_time', { withTimezone: true, mode: 'string' }),
    mallGiftPayNo: (0, pg_core_1.varchar)('mall_gift_pay_no', { length: 64 }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true, mode: 'string' })
        .defaultNow()
        .notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true, mode: 'string' }),
}, (table) => [
    (0, pg_core_1.index)('banquets_host_openid_idx').on(table.hostOpenid),
    (0, pg_core_1.index)('banquets_status_idx').on(table.status),
    (0, pg_core_1.index)('banquets_event_time_idx').on(table.eventTime),
]);
exports.giftRecords = (0, pg_core_1.pgTable)('gift_records', {
    id: (0, pg_core_1.varchar)('id', { length: 36 })
        .primaryKey()
        .default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    banquetId: (0, pg_core_1.varchar)('banquet_id', { length: 36 }).notNull(),
    guestOpenid: (0, pg_core_1.varchar)('guest_openid', { length: 128 }).notNull(),
    guestName: (0, pg_core_1.varchar)('guest_name', { length: 100 }).notNull(),
    amount: (0, pg_core_1.integer)('amount').notNull(),
    blessing: (0, pg_core_1.text)('blessing'),
    paymentStatus: (0, pg_core_1.varchar)('payment_status', { length: 20 }).default('pending').notNull(),
    returnGiftStatus: (0, pg_core_1.varchar)('return_gift_status', { length: 20 }).default('none').notNull(),
    transferStatus: (0, pg_core_1.varchar)('transfer_status', { length: 20 }).default('pending'),
    transferPaymentNo: (0, pg_core_1.varchar)('transfer_payment_no', { length: 64 }),
    transferErrorMsg: (0, pg_core_1.text)('transfer_error_msg'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true, mode: 'string' })
        .defaultNow()
        .notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true, mode: 'string' }),
}, (table) => [
    (0, pg_core_1.index)('gift_records_banquet_id_idx').on(table.banquetId),
    (0, pg_core_1.index)('gift_records_guest_openid_idx').on(table.guestOpenid),
    (0, pg_core_1.index)('gift_records_payment_status_idx').on(table.paymentStatus),
]);
exports.returnGifts = (0, pg_core_1.pgTable)('return_gifts', {
    id: (0, pg_core_1.varchar)('id', { length: 36 })
        .primaryKey()
        .default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    giftRecordId: (0, pg_core_1.varchar)('gift_record_id', { length: 36 }).notNull(),
    guestOpenid: (0, pg_core_1.varchar)('guest_openid', { length: 128 }).notNull(),
    redPacketAmount: (0, pg_core_1.integer)('red_packet_amount').default(0),
    giftIds: (0, pg_core_1.jsonb)('gift_ids'),
    status: (0, pg_core_1.varchar)('status', { length: 20 }).default('pending').notNull(),
    recipientName: (0, pg_core_1.varchar)('recipient_name', { length: 100 }),
    recipientPhone: (0, pg_core_1.varchar)('recipient_phone', { length: 20 }),
    recipientAddress: (0, pg_core_1.text)('recipient_address'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true, mode: 'string' })
        .defaultNow()
        .notNull(),
    claimedAt: (0, pg_core_1.timestamp)('claimed_at', { withTimezone: true, mode: 'string' }),
}, (table) => [
    (0, pg_core_1.index)('return_gifts_gift_record_id_idx').on(table.giftRecordId),
    (0, pg_core_1.index)('return_gifts_guest_openid_idx').on(table.guestOpenid),
    (0, pg_core_1.index)('return_gifts_status_idx').on(table.status),
]);
exports.gifts = (0, pg_core_1.pgTable)('gifts', {
    id: (0, pg_core_1.varchar)('id', { length: 36 })
        .primaryKey()
        .default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    image: (0, pg_core_1.text)('image').notNull(),
    marketPrice: (0, pg_core_1.integer)('market_price').notNull(),
    costPrice: (0, pg_core_1.integer)('cost_price').notNull(),
    stock: (0, pg_core_1.integer)('stock').default(0).notNull(),
    status: (0, pg_core_1.varchar)('status', { length: 20 }).default('active').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true, mode: 'string' })
        .defaultNow()
        .notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true, mode: 'string' }),
}, (table) => [(0, pg_core_1.index)('gifts_status_idx').on(table.status)]);
exports.partners = (0, pg_core_1.pgTable)('partners', {
    id: (0, pg_core_1.varchar)('id', { length: 36 })
        .primaryKey()
        .default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    openid: (0, pg_core_1.varchar)('openid', { length: 128 }).notNull().unique(),
    type: (0, pg_core_1.varchar)('type', { length: 50 }).notNull(),
    name: (0, pg_core_1.varchar)('name', { length: 100 }).notNull(),
    phone: (0, pg_core_1.varchar)('phone', { length: 20 }).notNull(),
    referralCode: (0, pg_core_1.varchar)('referral_code', { length: 50 }).notNull().unique(),
    totalCommission: (0, pg_core_1.integer)('total_commission').default(0).notNull(),
    availableCommission: (0, pg_core_1.integer)('available_commission').default(0).notNull(),
    status: (0, pg_core_1.varchar)('status', { length: 20 }).default('active').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true, mode: 'string' })
        .defaultNow()
        .notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true, mode: 'string' }),
}, (table) => [
    (0, pg_core_1.index)('partners_openid_idx').on(table.openid),
    (0, pg_core_1.index)('partners_referral_code_idx').on(table.referralCode),
]);
exports.channelPartners = (0, pg_core_1.pgTable)('channel_partners', {
    id: (0, pg_core_1.varchar)('id', { length: 36 })
        .primaryKey()
        .default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    companyName: (0, pg_core_1.varchar)('company_name', { length: 255 }).notNull(),
    contactName: (0, pg_core_1.varchar)('contact_name', { length: 100 }).notNull(),
    phone: (0, pg_core_1.varchar)('phone', { length: 20 }).notNull(),
    email: (0, pg_core_1.varchar)('email', { length: 255 }),
    businessType: (0, pg_core_1.varchar)('business_type', { length: 50 }),
    description: (0, pg_core_1.text)('description'),
    status: (0, pg_core_1.varchar)('status', { length: 20 }).default('pending').notNull(),
    reviewerNote: (0, pg_core_1.text)('reviewer_note'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true, mode: 'string' })
        .defaultNow()
        .notNull(),
    reviewedAt: (0, pg_core_1.timestamp)('reviewed_at', { withTimezone: true, mode: 'string' }),
}, (table) => [
    (0, pg_core_1.index)('channel_partners_phone_idx').on(table.phone),
    (0, pg_core_1.index)('channel_partners_status_idx').on(table.status),
]);
exports.giftProducts = (0, pg_core_1.pgTable)('gift_products', {
    id: (0, pg_core_1.varchar)('id', { length: 36 })
        .primaryKey()
        .default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    description: (0, pg_core_1.text)('description'),
    price: (0, pg_core_1.integer)('price').notNull(),
    originalPrice: (0, pg_core_1.integer)('original_price').notNull(),
    image: (0, pg_core_1.text)('image').notNull(),
    images: (0, pg_core_1.jsonb)('images'),
    category: (0, pg_core_1.varchar)('category', { length: 50 }).notNull(),
    stock: (0, pg_core_1.integer)('stock').default(0).notNull(),
    sales: (0, pg_core_1.integer)('sales').default(0).notNull(),
    status: (0, pg_core_1.varchar)('status', { length: 20 }).default('active').notNull(),
    giftType: (0, pg_core_1.varchar)('gift_type', { length: 20 }).default('onsite'),
    alibaba1688ProductId: (0, pg_core_1.varchar)('alibaba_1688_product_id', { length: 100 }),
    alibaba1688SkuId: (0, pg_core_1.varchar)('alibaba_1688_sku_id', { length: 100 }),
    alibaba1688Url: (0, pg_core_1.text)('alibaba_1688_url'),
    supplyCostPrice: (0, pg_core_1.integer)('supply_cost_price').default(0),
    alibaba1688SyncStatus: (0, pg_core_1.varchar)('alibaba_1688_sync_status', { length: 20 }).default('none'),
    alibaba1688SyncedAt: (0, pg_core_1.timestamp)('alibaba_1688_synced_at', {
        withTimezone: true,
        mode: 'string',
    }),
    source: (0, pg_core_1.varchar)('source', { length: 20 }).default('manual'),
    exchangeServiceFeeRate: (0, pg_core_1.numeric)('exchange_service_fee_rate', {
        precision: 5,
        scale: 4,
    }).default('0.0500'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true, mode: 'string' })
        .defaultNow()
        .notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true, mode: 'string' }),
}, (table) => [
    (0, pg_core_1.index)('gift_products_category_idx').on(table.category),
    (0, pg_core_1.index)('gift_products_status_idx').on(table.status),
    (0, pg_core_1.index)('gift_products_gift_type_idx').on(table.giftType),
    (0, pg_core_1.index)('gift_products_source_idx').on(table.source),
]);
exports.cartItems = (0, pg_core_1.pgTable)('cart_items', {
    id: (0, pg_core_1.varchar)('id', { length: 36 })
        .primaryKey()
        .default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    userOpenid: (0, pg_core_1.varchar)('user_openid', { length: 128 }).notNull(),
    productId: (0, pg_core_1.varchar)('product_id', { length: 36 }).notNull(),
    quantity: (0, pg_core_1.integer)('quantity').default(1).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true, mode: 'string' })
        .defaultNow()
        .notNull(),
}, (table) => [
    (0, pg_core_1.index)('cart_items_user_openid_idx').on(table.userOpenid),
    (0, pg_core_1.index)('cart_items_product_id_idx').on(table.productId),
]);
exports.users = (0, pg_core_1.pgTable)('users', {
    id: (0, pg_core_1.varchar)('id', { length: 36 })
        .primaryKey()
        .default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    openid: (0, pg_core_1.varchar)('openid', { length: 128 }).notNull().unique(),
    nickname: (0, pg_core_1.varchar)('nickname', { length: 100 }),
    avatar: (0, pg_core_1.text)('avatar'),
    phone: (0, pg_core_1.varchar)('phone', { length: 20 }),
    referrerId: (0, pg_core_1.varchar)('referrer_id', { length: 36 }),
    isVip: (0, pg_core_1.boolean)('is_vip').default(false).notNull(),
    vipExpireDate: (0, pg_core_1.timestamp)('vip_expire_date', { withTimezone: true, mode: 'string' }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true, mode: 'string' })
        .defaultNow()
        .notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true, mode: 'string' }),
}, (table) => [
    (0, pg_core_1.index)('users_openid_idx').on(table.openid),
    (0, pg_core_1.index)('users_referrer_id_idx').on(table.referrerId),
]);
exports.referralCodes = (0, pg_core_1.pgTable)('referral_codes', {
    id: (0, pg_core_1.varchar)('id', { length: 36 })
        .primaryKey()
        .default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    userId: (0, pg_core_1.varchar)('user_id', { length: 36 }).notNull(),
    code: (0, pg_core_1.varchar)('code', { length: 20 }).notNull().unique(),
    usedCount: (0, pg_core_1.integer)('used_count').default(0).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true, mode: 'string' })
        .defaultNow()
        .notNull(),
}, (table) => [
    (0, pg_core_1.index)('referral_codes_user_id_idx').on(table.userId),
    (0, pg_core_1.index)('referral_codes_code_idx').on(table.code),
]);
exports.referralBinds = (0, pg_core_1.pgTable)('referral_binds', {
    id: (0, pg_core_1.varchar)('id', { length: 36 })
        .primaryKey()
        .default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    referrerId: (0, pg_core_1.varchar)('referrer_id', { length: 36 }).notNull(),
    inviteeId: (0, pg_core_1.varchar)('invitee_id', { length: 36 }).notNull(),
    commissionRate: (0, pg_core_1.integer)('commission_rate').default(10).notNull(),
    commissionExpireDate: (0, pg_core_1.timestamp)('commission_expire_date', {
        withTimezone: true,
        mode: 'string',
    }).notNull(),
    totalCommission: (0, pg_core_1.integer)('total_commission').default(0).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true, mode: 'string' })
        .defaultNow()
        .notNull(),
}, (table) => [
    (0, pg_core_1.index)('referral_binds_referrer_id_idx').on(table.referrerId),
    (0, pg_core_1.index)('referral_binds_invitee_id_idx').on(table.inviteeId),
]);
exports.commissions = (0, pg_core_1.pgTable)('commissions', {
    id: (0, pg_core_1.varchar)('id', { length: 36 })
        .primaryKey()
        .default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    userId: (0, pg_core_1.varchar)('user_id', { length: 36 }).notNull(),
    inviteeId: (0, pg_core_1.varchar)('invitee_id', { length: 36 }).notNull(),
    paymentId: (0, pg_core_1.varchar)('payment_id', { length: 36 }),
    amount: (0, pg_core_1.integer)('amount').notNull(),
    status: (0, pg_core_1.varchar)('status', { length: 20 }).default('available').notNull(),
    expireDate: (0, pg_core_1.timestamp)('expire_date', { withTimezone: true, mode: 'string' }).notNull(),
    withdrawnAt: (0, pg_core_1.timestamp)('withdrawn_at', { withTimezone: true, mode: 'string' }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true, mode: 'string' })
        .defaultNow()
        .notNull(),
}, (table) => [
    (0, pg_core_1.index)('commissions_user_id_idx').on(table.userId),
    (0, pg_core_1.index)('commissions_invitee_id_idx').on(table.inviteeId),
    (0, pg_core_1.index)('commissions_status_idx').on(table.status),
]);
exports.withdrawRecords = (0, pg_core_1.pgTable)('withdraw_records', {
    id: (0, pg_core_1.varchar)('id', { length: 36 })
        .primaryKey()
        .default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    userId: (0, pg_core_1.varchar)('user_id', { length: 36 }).notNull(),
    amount: (0, pg_core_1.integer)('amount').notNull(),
    status: (0, pg_core_1.varchar)('status', { length: 20 }).default('pending').notNull(),
    bankName: (0, pg_core_1.varchar)('bank_name', { length: 100 }),
    bankAccount: (0, pg_core_1.varchar)('bank_account', { length: 50 }),
    realName: (0, pg_core_1.varchar)('real_name', { length: 50 }),
    failReason: (0, pg_core_1.text)('fail_reason'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true, mode: 'string' })
        .defaultNow()
        .notNull(),
    completedAt: (0, pg_core_1.timestamp)('completed_at', { withTimezone: true, mode: 'string' }),
}, (table) => [
    (0, pg_core_1.index)('withdraw_records_user_id_idx').on(table.userId),
    (0, pg_core_1.index)('withdraw_records_status_idx').on(table.status),
]);
exports.recommendOfficers = (0, pg_core_1.pgTable)('recommend_officers', {
    id: (0, pg_core_1.varchar)('id', { length: 36 })
        .primaryKey()
        .default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    openid: (0, pg_core_1.varchar)('openid', { length: 128 }).notNull().unique(),
    realName: (0, pg_core_1.varchar)('real_name', { length: 50 }).notNull(),
    idCard: (0, pg_core_1.varchar)('id_card', { length: 18 }),
    phone: (0, pg_core_1.varchar)('phone', { length: 20 }),
    status: (0, pg_core_1.varchar)('status', { length: 20 }).default('active').notNull(),
    vipCommissionRate: (0, pg_core_1.integer)('vip_commission_rate').default(30).notNull(),
    mallCommissionRate: (0, pg_core_1.integer)('mall_commission_rate').default(10).notNull(),
    totalCommission: (0, pg_core_1.integer)('total_commission').default(0).notNull(),
    availableCommission: (0, pg_core_1.integer)('available_commission').default(0).notNull(),
    totalInvitees: (0, pg_core_1.integer)('total_invitees').default(0).notNull(),
    remark: (0, pg_core_1.text)('remark'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true, mode: 'string' })
        .defaultNow()
        .notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true, mode: 'string' }),
}, (table) => [
    (0, pg_core_1.index)('recommend_officers_openid_idx').on(table.openid),
    (0, pg_core_1.index)('recommend_officers_status_idx').on(table.status),
]);
exports.officerReferrals = (0, pg_core_1.pgTable)('officer_referrals', {
    id: (0, pg_core_1.varchar)('id', { length: 36 })
        .primaryKey()
        .default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    officerId: (0, pg_core_1.varchar)('officer_id', { length: 36 }).notNull(),
    userId: (0, pg_core_1.varchar)('user_id', { length: 36 }).notNull(),
    commissionExpireDate: (0, pg_core_1.timestamp)('commission_expire_date', {
        withTimezone: true,
        mode: 'string',
    }).notNull(),
    totalCommission: (0, pg_core_1.integer)('total_commission').default(0).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true, mode: 'string' })
        .defaultNow()
        .notNull(),
}, (table) => [
    (0, pg_core_1.index)('officer_referrals_officer_id_idx').on(table.officerId),
    (0, pg_core_1.index)('officer_referrals_user_id_idx').on(table.userId),
]);
exports.officerCommissions = (0, pg_core_1.pgTable)('officer_commissions', {
    id: (0, pg_core_1.varchar)('id', { length: 36 })
        .primaryKey()
        .default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    officerId: (0, pg_core_1.varchar)('officer_id', { length: 36 }).notNull(),
    userId: (0, pg_core_1.varchar)('user_id', { length: 36 }).notNull(),
    paymentId: (0, pg_core_1.varchar)('payment_id', { length: 36 }),
    amount: (0, pg_core_1.integer)('amount').notNull(),
    commissionRate: (0, pg_core_1.integer)('commission_rate').notNull(),
    commissionType: (0, pg_core_1.varchar)('commission_type', { length: 20 }).notNull(),
    status: (0, pg_core_1.varchar)('status', { length: 20 }).default('available').notNull(),
    expireDate: (0, pg_core_1.timestamp)('expire_date', { withTimezone: true, mode: 'string' }),
    withdrawnAt: (0, pg_core_1.timestamp)('withdrawn_at', { withTimezone: true, mode: 'string' }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true, mode: 'string' })
        .defaultNow()
        .notNull(),
}, (table) => [
    (0, pg_core_1.index)('officer_commissions_officer_id_idx').on(table.officerId),
    (0, pg_core_1.index)('officer_commissions_user_id_idx').on(table.userId),
    (0, pg_core_1.index)('officer_commissions_status_idx').on(table.status),
]);
//# sourceMappingURL=schema.js.map