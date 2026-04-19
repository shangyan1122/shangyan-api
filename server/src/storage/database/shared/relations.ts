import { relations } from 'drizzle-orm/relations';
import {
  banquets,
  giftRecords,
  returnGifts,
  gifts,
  users,
  referralCodes,
  referralBinds,
  commissions,
  withdrawRecords,
  giftProducts,
  cartItems,
  partners,
  channelPartners,
  merchantAccounts,
} from './schema';

// 宴会与随礼记录的关系
export const banquetsRelations = relations(banquets, ({ many }) => ({
  giftRecords: many(giftRecords),
  returnGifts: many(returnGifts),
}));

// 随礼记录与宴会的关系
export const giftRecordsRelations = relations(giftRecords, ({ one }) => ({
  banquet: one(banquets, {
    fields: [giftRecords.banquetId],
    references: [banquets.id],
  }),
  returnGift: one(returnGifts, {
    fields: [giftRecords.id],
    references: [returnGifts.giftRecordId],
  }),
}));

// 回礼记录与随礼记录的关系
export const returnGiftsRelations = relations(returnGifts, ({ one }) => ({
  giftRecord: one(giftRecords, {
    fields: [returnGifts.giftRecordId],
    references: [giftRecords.id],
  }),
}));

// 用户与邀请码的关系
export const usersRelations = relations(users, ({ one, many }) => ({
  referralCode: one(referralCodes, {
    fields: [users.id],
    references: [referralCodes.userId],
  }),
  referralBindsAsReferrer: many(referralBinds, { relationName: 'referrer' }),
  referralBindsAsInvitee: many(referralBinds, { relationName: 'invitee' }),
  commissions: many(commissions),
  withdrawRecords: many(withdrawRecords),
}));

// 邀请码与用户的关系
export const referralCodesRelations = relations(referralCodes, ({ one }) => ({
  user: one(users, {
    fields: [referralCodes.userId],
    references: [users.id],
  }),
}));

// 邀请关系
export const referralBindsRelations = relations(referralBinds, ({ one }) => ({
  referrer: one(users, {
    fields: [referralBinds.referrerId],
    references: [users.id],
    relationName: 'referrer',
  }),
  invitee: one(users, {
    fields: [referralBinds.inviteeId],
    references: [users.id],
    relationName: 'invitee',
  }),
}));

// 佣金记录与用户的关系
export const commissionsRelations = relations(commissions, ({ one }) => ({
  user: one(users, {
    fields: [commissions.userId],
    references: [users.id],
  }),
  invitee: one(users, {
    fields: [commissions.inviteeId],
    references: [users.id],
  }),
}));

// 提现记录与用户的关系
export const withdrawRecordsRelations = relations(withdrawRecords, ({ one }) => ({
  user: one(users, {
    fields: [withdrawRecords.userId],
    references: [users.id],
  }),
}));

// 购物车与商品的关系
export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  product: one(giftProducts, {
    fields: [cartItems.productId],
    references: [giftProducts.id],
  }),
}));
