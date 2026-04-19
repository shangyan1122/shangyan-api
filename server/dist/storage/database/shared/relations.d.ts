export declare const banquetsRelations: import("drizzle-orm/relations").Relations<"banquets", {
    giftRecords: import("drizzle-orm/relations").Many<"gift_records">;
    returnGifts: import("drizzle-orm/relations").Many<"return_gifts">;
}>;
export declare const giftRecordsRelations: import("drizzle-orm/relations").Relations<"gift_records", {
    banquet: import("drizzle-orm/relations").One<"banquets", true>;
    returnGift: import("drizzle-orm/relations").One<"return_gifts", true>;
}>;
export declare const returnGiftsRelations: import("drizzle-orm/relations").Relations<"return_gifts", {
    giftRecord: import("drizzle-orm/relations").One<"gift_records", true>;
}>;
export declare const usersRelations: import("drizzle-orm/relations").Relations<"users", {
    referralCode: import("drizzle-orm/relations").One<"referral_codes", true>;
    referralBindsAsReferrer: import("drizzle-orm/relations").Many<"referral_binds">;
    referralBindsAsInvitee: import("drizzle-orm/relations").Many<"referral_binds">;
    commissions: import("drizzle-orm/relations").Many<"commissions">;
    withdrawRecords: import("drizzle-orm/relations").Many<"withdraw_records">;
}>;
export declare const referralCodesRelations: import("drizzle-orm/relations").Relations<"referral_codes", {
    user: import("drizzle-orm/relations").One<"users", true>;
}>;
export declare const referralBindsRelations: import("drizzle-orm/relations").Relations<"referral_binds", {
    referrer: import("drizzle-orm/relations").One<"users", true>;
    invitee: import("drizzle-orm/relations").One<"users", true>;
}>;
export declare const commissionsRelations: import("drizzle-orm/relations").Relations<"commissions", {
    user: import("drizzle-orm/relations").One<"users", true>;
    invitee: import("drizzle-orm/relations").One<"users", true>;
}>;
export declare const withdrawRecordsRelations: import("drizzle-orm/relations").Relations<"withdraw_records", {
    user: import("drizzle-orm/relations").One<"users", true>;
}>;
export declare const cartItemsRelations: import("drizzle-orm/relations").Relations<"cart_items", {
    product: import("drizzle-orm/relations").One<"gift_products", true>;
}>;
