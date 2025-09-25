import "reflect-metadata";
import { ReferralCodeDto } from "../../src/model/dto/referral-code-dto";
import { ReferralCodeQueryParams } from "../../src/model/params/referral-code-query-params";
import { IReferralCodeService, ReferralCodeListResult } from "../../src/service/interface/referral-code-interface";

describe("Referral code service interface", () => {
    const baseReferralCode = new ReferralCodeDto({
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Always On",
        type: 1,
        valid_from: "2025-01-01T00:00:00Z",
        code: "ALWAYS",
    });

    test("constructs a ReferralCodeListResult typed object", () => {
        const listResult: ReferralCodeListResult = {
            total_items: 1,
            per_page: 10,
            current_page: 1,
            total_pages: 1,
            data: [baseReferralCode],
        };

        expect(listResult.data[0]).toBe(baseReferralCode);
    });

    test("allows creating a class that satisfies IReferralCodeService", async () => {
        class TestReferralCodeService implements IReferralCodeService {
            async getReferralCodes(): Promise<ReferralCodeListResult> {
                return {
                    total_items: 1,
                    per_page: 10,
                    current_page: 1,
                    total_pages: 1,
                    data: [baseReferralCode],
                };
            }

            async createReferralCode(
                _projectGroupId: string,
                referralCode: ReferralCodeDto,
                _userId: string,
            ): Promise<ReferralCodeDto> {
                return referralCode;
            }

            async updateReferralCode(
                _projectGroupId: string,
                _codeId: string,
                referralCode: ReferralCodeDto,
                _userId: string,
            ): Promise<ReferralCodeDto> {
                return referralCode;
            }

            async deleteReferralCode(_projectGroupId: string, _codeId: string, _userId: string): Promise<boolean> {
                return true;
            }
        }

        const service: IReferralCodeService = new TestReferralCodeService();
        const queryParams = new ReferralCodeQueryParams();

        const list = await service.getReferralCodes("proj-group-id", queryParams);
        const created = await service.createReferralCode("proj-group-id", baseReferralCode, "user-id");
        const updated = await service.updateReferralCode("proj-group-id", baseReferralCode.id!, baseReferralCode, "user-id");
        const deleted = await service.deleteReferralCode("proj-group-id", baseReferralCode.id!, "user-id");

        expect(list.total_items).toBe(1);
        expect(created).toBe(baseReferralCode);
        expect(updated).toBe(baseReferralCode);
        expect(deleted).toBe(true);
    });
});
