export interface PartnerApplication {
    id: string;
    company_name: string;
    contact_name: string;
    phone: string;
    email?: string;
    business_type?: string;
    description?: string;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
    reviewed_at?: string;
    reviewer_note?: string;
}
export declare class PartnerService {
    private readonly logger;
    submitApplication(data: {
        companyName: string;
        contactName: string;
        phone: string;
        email?: string;
        businessType?: string;
        description?: string;
    }): Promise<PartnerApplication>;
    getApplications(page?: number, pageSize?: number, status?: string): Promise<{
        records: any[];
        total: number;
    }>;
    getApplicationById(id: string): Promise<PartnerApplication | null>;
    reviewApplication(id: string, status: 'approved' | 'rejected', reviewerNote?: string): Promise<PartnerApplication>;
    checkPhoneExists(phone: string): Promise<boolean>;
}
