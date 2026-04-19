"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cartItemsRelations = exports.withdrawRecordsRelations = exports.commissionsRelations = exports.referralBindsRelations = exports.referralCodesRelations = exports.usersRelations = exports.returnGiftsRelations = exports.giftRecordsRelations = exports.banquetsRelations = void 0;
const relations_1 = require("drizzle-orm/relations");
const schema_1 = require("./schema");
exports.banquetsRelations = (0, relations_1.relations)(schema_1.banquets, ({ many }) => ({
    giftRecords: many(schema_1.giftRecords),
    returnGifts: many(schema_1.returnGifts),
}));
exports.giftRecordsRelations = (0, relations_1.relations)(schema_1.giftRecords, ({ one }) => ({
    banquet: one(schema_1.banquets, {
        fields: [schema_1.giftRecords.banquetId],
        references: [schema_1.banquets.id],
    }),
    returnGift: one(schema_1.returnGifts, {
        fields: [schema_1.giftRecords.id],
        references: [schema_1.returnGifts.giftRecordId],
    }),
}));
exports.returnGiftsRelations = (0, relations_1.relations)(schema_1.returnGifts, ({ one }) => ({
    giftRecord: one(schema_1.giftRecords, {
        fields: [schema_1.returnGifts.giftRecordId],
        references: [schema_1.giftRecords.id],
    }),
}));
exports.usersRelations = (0, relations_1.relations)(schema_1.users, ({ one, many }) => ({
    referralCode: one(schema_1.referralCodes, {
        fields: [schema_1.users.id],
        references: [schema_1.referralCodes.userId],
    }),
    referralBindsAsReferrer: many(schema_1.referralBinds, { relationName: 'referrer' }),
    referralBindsAsInvitee: many(schema_1.referralBinds, { relationName: 'invitee' }),
    commissions: many(schema_1.commissions),
    withdrawRecords: many(schema_1.withdrawRecords),
}));
exports.referralCodesRelations = (0, relations_1.relations)(schema_1.referralCodes, ({ one }) => ({
    user: one(schema_1.users, {
        fields: [schema_1.referralCodes.userId],
        references: [schema_1.users.id],
    }),
}));
exports.referralBindsRelations = (0, relations_1.relations)(schema_1.referralBinds, ({ one }) => ({
    referrer: one(schema_1.users, {
        fields: [schema_1.referralBinds.referrerId],
        references: [schema_1.users.id],
        relationName: 'referrer',
    }),
    invitee: one(schema_1.users, {
        fields: [schema_1.referralBinds.inviteeId],
        references: [schema_1.users.id],
        relationName: 'invitee',
    }),
}));
exports.commissionsRelations = (0, relations_1.relations)(schema_1.commissions, ({ one }) => ({
    user: one(schema_1.users, {
        fields: [schema_1.commissions.userId],
        references: [schema_1.users.id],
    }),
    invitee: one(schema_1.users, {
        fields: [schema_1.commissions.inviteeId],
        references: [schema_1.users.id],
    }),
}));
exports.withdrawRecordsRelations = (0, relations_1.relations)(schema_1.withdrawRecords, ({ one }) => ({
    user: one(schema_1.users, {
        fields: [schema_1.withdrawRecords.userId],
        references: [schema_1.users.id],
    }),
}));
exports.cartItemsRelations = (0, relations_1.relations)(schema_1.cartItems, ({ one }) => ({
    product: one(schema_1.giftProducts, {
        fields: [schema_1.cartItems.productId],
        references: [schema_1.giftProducts.id],
    }),
}));
//# sourceMappingURL=relations.js.map