import dbClient from "../../src/database/data-source";
import referralCodeService from "../../src/service/referral-code-service";
import { ReferralCodeDto } from "../../src/model/dto/referral-code-dto";
import { ReferralCodeQueryParams } from "../../src/model/params/referral-code-query-params";
import { QueryResult } from "pg";
import HttpException from "../../src/exceptions/http/http-base-exception";

describe("ReferralCodeService", () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe("getReferralCodes", () => {
        test("throws error when projectGroupId is missing", async () => {
            await expect(referralCodeService.getReferralCodes("", new ReferralCodeQueryParams())).rejects.toThrow(HttpException);
        });

        test("returns paginated referral codes with filters applied", async () => {
            const countResult: QueryResult = {
                rows: [{ total: 2 }],
                rowCount: 1,
                command: "SELECT",
                fields: [],
            } as any;

            const dataRow = {
                id: "123e4567-e89b-12d3-a456-426614174000",
                name: "Summer Special",
                type: 2,
                valid_from: "2025-09-24T10:00:00Z",
                code: "SUMMER",
                valid_to: "2025-10-24T23:59:59Z",
                instructions_url: "https://example.com",
                project_group_id: "proj-group-id",
                user_id: "user-id",
                created_at: "2025-09-20T08:00:00Z",
                updated_at: "2025-09-21T08:00:00Z",
                description: "Promo",
                is_active: true,
            };
            const dataResult: QueryResult = {
                rows: [dataRow],
                rowCount: 1,
                command: "SELECT",
                fields: [],
            } as any;

            const querySpy = jest
                .spyOn(dbClient, "query")
                .mockResolvedValueOnce(countResult)
                .mockResolvedValueOnce(dataResult);

            const params = new ReferralCodeQueryParams({
                page_no: 2,
                page_size: 80,
                type: "2",
                name: "  Summer  ",
                code: " SUMMER ",
            });

            const result = await referralCodeService.getReferralCodes("proj-group-id", params);

            expect(result).toEqual({
                total_items: 2,
                per_page: 50,
                current_page: 2,
                total_pages: 1,
                data: [expect.any(ReferralCodeDto)],
            });

            expect(querySpy).toHaveBeenNthCalledWith(1, expect.objectContaining({
                values: ["proj-group-id", true, 2, "%Summer%", "%SUMMER%"],
            }));
            expect(querySpy).toHaveBeenNthCalledWith(2, expect.objectContaining({
                values: ["proj-group-id", true, 2, "%Summer%", "%SUMMER%", 50, 50],
            }));
        });

        test("uses default pagination and ignores non numeric type filter", async () => {
            const countResult: QueryResult = {
                rows: [{ total: 0 }],
                rowCount: 1,
                command: "SELECT",
                fields: [],
            } as any;
            const dataResult: QueryResult = {
                rows: [],
                rowCount: 0,
                command: "SELECT",
                fields: [],
            } as any;

            const querySpy = jest
                .spyOn(dbClient, "query")
                .mockResolvedValueOnce(countResult)
                .mockResolvedValueOnce(dataResult);

            const params = new ReferralCodeQueryParams({
                page_no: undefined,
                page_size: undefined,
                type: "invalid",
            });

            const result = await referralCodeService.getReferralCodes("proj-group-id", params);

            expect(result).toEqual({
                total_items: 0,
                per_page: 10,
                current_page: 1,
                total_pages: 0,
                data: [],
            });

            expect(querySpy).toHaveBeenNthCalledWith(1, expect.objectContaining({
                values: ["proj-group-id", true],
            }));
            expect(querySpy).toHaveBeenNthCalledWith(2, expect.objectContaining({
                values: ["proj-group-id", true, 10, 0],
            }));
        });
    });

    describe("createReferralCode", () => {
        test("throws error when user context is missing", async () => {
            const dto = new ReferralCodeDto({
                name: "Sample",
                type: 1,
                valid_from: "2025-01-01T00:00:00Z",
                code: "SAMPLE",
            });

            await expect(referralCodeService.createReferralCode("proj", dto, "")).rejects.toThrow(HttpException);
        });

        test("creates referral code with normalized input", async () => {
            const insertedRow = {
                id: "123e4567-e89b-12d3-a456-426614174000",
                name: "Fall Special",
                type: 2,
                valid_from: "2025-10-01T00:00:00Z",
                code: "FALL25",
                valid_to: "2025-11-30T23:59:59Z",
                instructions_url: "https://example.com/fall",
                project_group_id: "proj",
                user_id: "user",
                created_at: "2025-09-01T00:00:00Z",
                updated_at: "2025-09-01T00:00:00Z",
                description: "Great promo",
                is_active: true,
            };

            const querySpy = jest
                .spyOn(dbClient, "query")
                .mockResolvedValueOnce({ rows: [] } as any)
                .mockResolvedValueOnce({ rows: [insertedRow] } as any);

            const dto = new ReferralCodeDto({
                name: "  Fall Special  ",
                type: 2,
                valid_from: "2025-10-01T00:00:00Z",
                code: " FALL25 ",
                valid_to: "2025-11-30T23:59:59Z",
                instructions_url: " https://example.com/fall ",
                description: " Great promo ",
            });

            const result = await referralCodeService.createReferralCode("proj", dto, "user");

            expect(querySpy).toHaveBeenNthCalledWith(1, expect.objectContaining({
                text: expect.stringContaining("SELECT id, is_active FROM promo_referrals"),
                values: ["FALL25"],
            }));

            expect(querySpy).toHaveBeenNthCalledWith(2, expect.objectContaining({
                values: [
                    "Fall Special",
                    2,
                    "2025-10-01T00:00:00Z",
                    "FALL25",
                    "2025-11-30T23:59:59Z",
                    "https://example.com/fall",
                    "proj",
                    "user",
                    "Great promo",
                ],
            }));
            expect(result).toBeInstanceOf(ReferralCodeDto);
            expect(result).toEqual(expect.objectContaining({ code: "FALL25" }));
        });

        test("throws 402 when code already exists", async () => {
            const dto = new ReferralCodeDto({
                name: "Promo",
                type: 2,
                valid_from: "2025-10-01T00:00:00Z",
                code: "PROMO",
                valid_to: "2025-11-01T00:00:00Z",
            });

            jest.spyOn(dbClient, "query").mockResolvedValueOnce({
                rows: [{ id: "existing-id", is_active: true }],
            } as any);

            await expect(referralCodeService.createReferralCode("proj", dto, "user")).rejects.toMatchObject({
                status: 402,
                message: "Code already exists",
            });
        });

        test("throws 402 when existing record is inactive", async () => {
            const dto = new ReferralCodeDto({
                name: "Promo",
                type: 2,
                valid_from: "2025-10-01T00:00:00Z",
                code: "PROMO",
                valid_to: "2025-11-01T00:00:00Z",
            });

            const querySpy = jest
                .spyOn(dbClient, "query")
                .mockResolvedValueOnce({ rows: [{ id: "old-id", is_active: false }] } as any);

            await expect(referralCodeService.createReferralCode("proj", dto, "user")).rejects.toMatchObject({
                status: 402,
                message: "Code already exists",
            });

            expect(querySpy).toHaveBeenCalledTimes(1);
        });

        test("throws error when limited time code is missing valid_to", async () => {
            const dto = new ReferralCodeDto({
                name: "Promo",
                type: 2,
                valid_from: "2025-10-01T00:00:00Z",
                code: "PROMO",
            });

            await expect(referralCodeService.createReferralCode("proj", dto, "user")).rejects.toThrow(HttpException);
        });

        test("throws error when valid_to is before valid_from", async () => {
            const dto = new ReferralCodeDto({
                name: "Promo",
                type: 2,
                valid_from: "2025-10-02T00:00:00Z",
                valid_to: "2025-10-01T00:00:00Z",
                code: "PROMO",
            });

            await expect(referralCodeService.createReferralCode("proj", dto, "user")).rejects.toThrow(HttpException);
        });

        test("throws error when type is not numeric", async () => {
            const dto = new ReferralCodeDto({
                name: "Promo",
                type: "not-a-number" as any,
                valid_from: "2025-10-01T00:00:00Z",
                code: "PROMO",
            });

            await expect(referralCodeService.createReferralCode("proj", dto, "user")).rejects.toThrow(HttpException);
        });

        test("normalizes always available code by clearing valid_to and instructions", async () => {
            const insertedRow = {
                id: "123e4567-e89b-12d3-a456-426614174000",
                name: "Always On",
                type: 1,
                valid_from: "2025-10-01T00:00:00Z",
                code: "ALWAYS",
                valid_to: null,
                instructions_url: null,
                project_group_id: "proj",
                user_id: "user",
                created_at: "2025-09-01T00:00:00Z",
                updated_at: "2025-09-01T00:00:00Z",
                description: null,
                is_active: true,
            };

            const querySpy = jest
                .spyOn(dbClient, "query")
                .mockResolvedValueOnce({ rows: [] } as any)
                .mockResolvedValueOnce({ rows: [insertedRow] } as any);

            const dto = new ReferralCodeDto({
                name: " Always On ",
                type: 1,
                valid_from: "2025-10-01T00:00:00Z",
                code: " ALWAYS ",
                valid_to: "2025-12-01T00:00:00Z",
                instructions_url: "   ",
                description: undefined,
            });

            await referralCodeService.createReferralCode("proj", dto, "user");

            expect(querySpy).toHaveBeenNthCalledWith(1, expect.objectContaining({
                text: expect.stringContaining("SELECT id, is_active FROM promo_referrals"),
                values: ["ALWAYS"],
            }));

            expect(querySpy).toHaveBeenNthCalledWith(2, expect.objectContaining({
                values: [
                    "Always On",
                    1,
                    "2025-10-01T00:00:00Z",
                    "ALWAYS",
                    null,
                    null,
                    "proj",
                    "user",
                    null,
                ],
            }));
        });
    });

    describe("updateReferralCode", () => {
        test("throws error when user context is missing", async () => {
            const dto = new ReferralCodeDto({
                id: "code-id",
                name: "Promo",
                type: 1,
                valid_from: "2025-10-01T00:00:00Z",
                code: "PROMO",
            });

            await expect(referralCodeService.updateReferralCode("proj", "code-id", dto, "")).rejects.toThrow(HttpException);
        });

        test("throws error when code id is missing", async () => {
            const dto = new ReferralCodeDto({
                name: "Promo",
                type: 1,
                valid_from: "2025-10-01T00:00:00Z",
                code: "PROMO",
            });

            await expect(referralCodeService.updateReferralCode("proj", "", dto, "user")).rejects.toThrow(HttpException);
        });

        test("updates referral code successfully", async () => {
            const ensureResult: QueryResult = {
                rows: [{ id: "code-id", is_active: true }],
                rowCount: 1,
                command: "SELECT",
                fields: [],
            } as any;
            const updatedRow = {
                id: "code-id",
                name: "Promo",
                type: 1,
                valid_from: "2025-10-01T00:00:00Z",
                code: "PROMO",
                valid_to: null,
                instructions_url: null,
                project_group_id: "proj",
                user_id: "user",
                created_at: "2025-09-01T00:00:00Z",
                updated_at: "2025-09-02T00:00:00Z",
                description: null,
                is_active: true,
            };
            const updateResult: QueryResult = {
                rows: [updatedRow],
                rowCount: 1,
                command: "UPDATE",
                fields: [],
            } as any;

            const querySpy = jest
                .spyOn(dbClient, "query")
                .mockResolvedValueOnce(ensureResult)
                .mockResolvedValueOnce({ rows: [{ id: "code-id", is_active: true }] } as any)
                .mockResolvedValueOnce(updateResult);

            const dto = new ReferralCodeDto({
                id: "code-id",
                name: " Promo ",
                type: 1,
                valid_from: "2025-10-01T00:00:00Z",
                code: " PROMO ",
                valid_to: "2025-10-15T00:00:00Z",
            });

            const result = await referralCodeService.updateReferralCode("proj", "code-id", dto, "user");

            expect(querySpy).toHaveBeenNthCalledWith(3, expect.objectContaining({
                values: [
                    "Promo",
                    1,
                    "2025-10-01T00:00:00Z",
                    "PROMO",
                    null,
                    null,
                    null,
                    "user",
                    "code-id",
                    "proj",
                ],
            }));
            expect(result).toBeInstanceOf(ReferralCodeDto);
            expect(result).toEqual(expect.objectContaining({ id: "code-id", code: "PROMO" }));
        });

        test("throws 402 when updating with duplicate code", async () => {
            const ensureResult: QueryResult = {
                rows: [{ id: "code-id", is_active: true }],
                rowCount: 1,
                command: "SELECT",
                fields: [],
            } as any;

            jest
                .spyOn(dbClient, "query")
                .mockResolvedValueOnce(ensureResult)
                .mockResolvedValueOnce({ rows: [{ id: "other-id", is_active: false }] } as any);

            const dto = new ReferralCodeDto({
                id: "code-id",
                name: "Promo",
                type: 1,
                valid_from: "2025-10-01T00:00:00Z",
                code: "PROMO",
            });

            await expect(referralCodeService.updateReferralCode("proj", "code-id", dto, "user")).rejects.toMatchObject({
                status: 402,
                message: "Code already exists",
            });
        });

        test("throws not found error when referral code does not exist", async () => {
            const ensureResult: QueryResult = {
                rows: [],
                rowCount: 0,
                command: "SELECT",
                fields: [],
            } as any;

            jest.spyOn(dbClient, "query").mockResolvedValueOnce(ensureResult);

            const dto = new ReferralCodeDto({
                id: "code-id",
                name: "Promo",
                type: 1,
                valid_from: "2025-10-01T00:00:00Z",
                code: "PROMO",
            });

            await expect(referralCodeService.updateReferralCode("proj", "code-id", dto, "user")).rejects.toThrow(HttpException);
        });
    });

    describe("deleteReferralCode", () => {
        test("throws error when user context is missing", async () => {
            await expect(referralCodeService.deleteReferralCode("proj", "code", "")).rejects.toThrow(HttpException);
        });

        test("throws error when referral code id is missing", async () => {
            await expect(referralCodeService.deleteReferralCode("proj", "", "user")).rejects.toThrow(HttpException);
        });

        test("soft deletes referral code successfully", async () => {
            jest.spyOn(dbClient, "query").mockResolvedValueOnce({ rowCount: 1 } as QueryResult);

            await expect(referralCodeService.deleteReferralCode("proj", "code", "user")).resolves.toBe(true);
        });

        test("throws not found when no rows are updated", async () => {
            jest.spyOn(dbClient, "query").mockResolvedValueOnce({ rowCount: 0 } as QueryResult);

            await expect(referralCodeService.deleteReferralCode("proj", "code", "user")).rejects.toThrow(HttpException);
        });
    });
});
