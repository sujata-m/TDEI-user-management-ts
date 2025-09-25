import { ReferralCodeDto } from "../../model/dto/referral-code-dto";
import { ReferralCodeQueryParams } from "../../model/params/referral-code-query-params";

export interface ReferralCodeListResult {
    total_items: number;
    per_page: number;
    current_page: number;
    total_pages: number;
    data: ReferralCodeDto[];
}

export interface IReferralCodeService {
    getReferralCodes(projectGroupId: string, params: ReferralCodeQueryParams): Promise<ReferralCodeListResult>;
    createReferralCode(projectGroupId: string, referralCode: ReferralCodeDto, userId: string): Promise<ReferralCodeDto>;
    updateReferralCode(projectGroupId: string, codeId: string, referralCode: ReferralCodeDto, userId: string): Promise<ReferralCodeDto>;
    deleteReferralCode(projectGroupId: string, codeId: string, userId: string): Promise<boolean>;
}
