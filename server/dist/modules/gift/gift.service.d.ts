export declare class GiftService {
    getBanquetInfo(banquetId: string): Promise<any>;
    checkGuestExists(banquetId: string, guestOpenid: string): Promise<boolean>;
    createGiftRecord(recordData: any): Promise<any>;
    updatePaymentStatus(recordId: string, status: string): Promise<any>;
    getGiftRecordByOrderId(orderId: string): Promise<any>;
    updateTransferStatus(recordId: string, status: 'pending' | 'transferred' | 'transfer_failed', paymentNo?: string | null, errorMsg?: string | null): Promise<any>;
    checkReturnGift(giftRecordId: string): Promise<{
        eligible: boolean;
        returnRedPacket: any;
        returnGiftIds: any;
    } | {
        eligible: boolean;
        returnRedPacket?: undefined;
        returnGiftIds?: undefined;
    } | null>;
    verifyHostPermission(banquetId: string, hostOpenid: string): Promise<boolean>;
    supplementGiftRecord(recordData: any): Promise<any>;
    batchSupplementGiftRecords(banquetId: string, records: Array<{
        guestName: string;
        guestPhone?: string;
        amount: number;
        blessing?: string;
        giftTime?: string;
    }>): Promise<{
        success: number;
        failed: number;
        records: any[];
    }>;
    getSupplementRecords(banquetId: string): Promise<any[]>;
    deleteSupplementRecord(recordId: string, hostOpenid: string): Promise<{
        success: boolean;
    }>;
}
