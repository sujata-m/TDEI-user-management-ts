import projectGroupController from "../../src/controller/project-group-controller";
import referralCodeService from "../../src/service/referral-code-service";
import { ReferralCodeQueryParams } from "../../src/model/params/referral-code-query-params";
import { ReferralCodeDto } from "../../src/model/dto/referral-code-dto";
import * as httpResponses from "../../src/model/http/http-responses";
import { Utility } from "../../src/utility/utility";
import { ReferralCodeListResult } from "../../src/service/interface/referral-code-interface";
import { NextFunction, Request, Response } from "express";

describe("ProjectGroupController referral code endpoints", () => {
    const createResponse = (): Response => ({
        status: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
    } as unknown as Response);

    const createNext = (): NextFunction => jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe("getReferralCodes", () => {
        test("sanitizes pagination defaults and ignores non-numeric type filters", async () => {
            const params = new ReferralCodeQueryParams({ name: "Summer" });
            const fromSpy = jest.spyOn(ReferralCodeQueryParams, "from").mockReturnValue(params);
            const serviceResult: ReferralCodeListResult = {
                total_items: 0,
                per_page: 10,
                current_page: 1,
                total_pages: 0,
                data: [],
            };
            const getSpy = jest.spyOn(referralCodeService, "getReferralCodes").mockResolvedValue(serviceResult);
            const okSpy = jest.spyOn(httpResponses, "Ok");

            const request = {
                params: { projectGroupId: "proj-123" },
                query: { page_no: "invalid", page_size: "0", type: "abc", name: " Summer " },
            } as unknown as Request;
            const response = createResponse();
            const next = createNext();

            await projectGroupController.getReferralCodes(request, response, next);

            expect(fromSpy).toHaveBeenCalledWith(request.query);
            expect(params.page_no).toBe(1);
            expect(params.page_size).toBe(10);
            expect(params.type).toBeUndefined();
            expect(getSpy).toHaveBeenCalledWith("proj-123", params);
            expect(okSpy).toHaveBeenCalledWith(response, serviceResult);
            expect(response.status).toHaveBeenCalledWith(200);
            expect(response.send).toHaveBeenCalledWith(serviceResult);
            expect(next).not.toHaveBeenCalled();
        });

        test("parses numeric pagination and type filters before delegating to the service", async () => {
            const params = new ReferralCodeQueryParams();
            const fromSpy = jest.spyOn(ReferralCodeQueryParams, "from").mockReturnValue(params);
            const serviceResult: ReferralCodeListResult = {
                total_items: 5,
                per_page: 25,
                current_page: 3,
                total_pages: 1,
                data: [],
            };
            const getSpy = jest.spyOn(referralCodeService, "getReferralCodes").mockResolvedValue(serviceResult);
            const okSpy = jest.spyOn(httpResponses, "Ok");

            const request = {
                params: { projectGroupId: "proj-789" },
                query: { page_no: "3", page_size: "25", type: "2" },
            } as unknown as Request;
            const response = createResponse();
            const next = createNext();

            await projectGroupController.getReferralCodes(request, response, next);

            expect(fromSpy).toHaveBeenCalledWith(request.query);
            expect(params.page_no).toBe(3);
            expect(params.page_size).toBe(25);
            expect(params.type).toBe(2);
            expect(getSpy).toHaveBeenCalledWith("proj-789", params);
            expect(okSpy).toHaveBeenCalledWith(response, serviceResult);
            expect(response.status).toHaveBeenCalledWith(200);
            expect(response.send).toHaveBeenCalledWith(serviceResult);
            expect(next).not.toHaveBeenCalled();
        });

        test("routes service errors through the shared error handler", async () => {
            const params = new ReferralCodeQueryParams();
            jest.spyOn(ReferralCodeQueryParams, "from").mockReturnValue(params);
            const error = new Error("boom");
            jest.spyOn(referralCodeService, "getReferralCodes").mockRejectedValue(error);
            const handleErrorSpy = jest.spyOn(Utility, "handleError").mockImplementation(() => undefined);

            const request = {
                params: { projectGroupId: "proj-001" },
                query: {},
            } as unknown as Request;
            const response = createResponse();
            const next = createNext();

            await projectGroupController.getReferralCodes(request, response, next);

            expect(handleErrorSpy).toHaveBeenCalledWith(response, next, error, "Error fetching referral codes.");
        });
    });

    describe("createReferralCode", () => {
        test("enriches the DTO with context before calling the service", async () => {
            const dto = new ReferralCodeDto({
                name: "New Code",
                type: 1,
                valid_from: "2025-01-01T00:00:00Z",
                code: "NEWCODE",
            });
            const fromSpy = jest.spyOn(ReferralCodeDto as any, "from").mockReturnValue(dto);
            const created = new ReferralCodeDto({ id: "code-id", name: "New Code" });
            const createSpy = jest.spyOn(referralCodeService, "createReferralCode").mockResolvedValue(created);
            const okSpy = jest.spyOn(httpResponses, "Ok");

            const request = {
                params: { projectGroupId: "proj-456" },
                body: {},
                userId: "user-123",
            } as unknown as Request & { userId: string };
            const response = createResponse();
            const next = createNext();

            await projectGroupController.createReferralCode(request, response, next);

            expect(fromSpy).toHaveBeenCalledWith(request.body);
            expect(dto.project_group_id).toBe("proj-456");
            expect(dto.user_id).toBe("user-123");
            expect(createSpy).toHaveBeenCalledWith("proj-456", dto, "user-123");
            expect(okSpy).toHaveBeenCalledWith(response, { data: created });
            expect(response.status).toHaveBeenCalledWith(200);
            expect(response.send).toHaveBeenCalledWith({ data: created });
            expect(next).not.toHaveBeenCalled();
        });

        test("sends failures to the shared error handler", async () => {
            const dto = new ReferralCodeDto({
                name: "Err Code",
                type: 2,
                valid_from: "2025-01-01T00:00:00Z",
                valid_to: "2025-02-01T00:00:00Z",
                code: "ERR",
            });
            jest.spyOn(ReferralCodeDto as any, "from").mockReturnValue(dto);
            const error = new Error("create failed");
            jest.spyOn(referralCodeService, "createReferralCode").mockRejectedValue(error);
            const handleErrorSpy = jest.spyOn(Utility, "handleError").mockImplementation(() => undefined);

            const request = {
                params: { projectGroupId: "proj-456" },
                body: {},
                userId: "user-123",
            } as unknown as Request & { userId: string };
            const response = createResponse();
            const next = createNext();

            await projectGroupController.createReferralCode(request, response, next);

            expect(handleErrorSpy).toHaveBeenCalledWith(response, next, error, "Error creating referral code.");
        });
    });

    describe("updateReferralCode", () => {
        test("rejects mismatched IDs with a bad request response", async () => {
            const dto = new ReferralCodeDto({
                id: "different-id",
                name: "Mismatch",
                type: 1,
                valid_from: "2025-01-01T00:00:00Z",
                code: "MISMATCH",
            });
            jest.spyOn(ReferralCodeDto as any, "from").mockReturnValue(dto);
            const badRequestSpy = jest.spyOn(httpResponses, "BadRequest");
            const updateSpy = jest.spyOn(referralCodeService, "updateReferralCode");

            const request = {
                params: { projectGroupId: "proj-999", code_id: "expected-id" },
                body: {},
                userId: "user-abc",
            } as unknown as Request & { userId: string };
            const response = createResponse();
            const next = createNext();

            await projectGroupController.updateReferralCode(request, response, next);

            expect(badRequestSpy).toHaveBeenCalledWith(response, "Referral code id mismatch between path and payload.");
            expect(updateSpy).not.toHaveBeenCalled();
        });

        test("applies identifiers and delegates to the service", async () => {
            const dto = new ReferralCodeDto({
                name: "Update Me",
                type: 2,
                valid_from: "2025-01-01T00:00:00Z",
                valid_to: "2025-02-01T00:00:00Z",
                code: "UPDATE",
            });
            jest.spyOn(ReferralCodeDto as any, "from").mockReturnValue(dto);
            const updated = new ReferralCodeDto({ id: "expected-id", name: "Update Me" });
            const updateSpy = jest.spyOn(referralCodeService, "updateReferralCode").mockResolvedValue(updated);
            const okSpy = jest.spyOn(httpResponses, "Ok");

            const request = {
                params: { projectGroupId: "proj-999", code_id: "expected-id" },
                body: {},
                userId: "user-abc",
            } as unknown as Request & { userId: string };
            const response = createResponse();
            const next = createNext();

            await projectGroupController.updateReferralCode(request, response, next);

            expect(dto.id).toBe("expected-id");
            expect(dto.project_group_id).toBe("proj-999");
            expect(dto.user_id).toBe("user-abc");
            expect(updateSpy).toHaveBeenCalledWith("proj-999", "expected-id", dto, "user-abc");
            expect(okSpy).toHaveBeenCalledWith(response, { data: updated });
            expect(response.status).toHaveBeenCalledWith(200);
            expect(response.send).toHaveBeenCalledWith({ data: updated });
            expect(next).not.toHaveBeenCalled();
        });

        test("forwards update errors to the shared handler", async () => {
            const dto = new ReferralCodeDto({
                name: "Update Me",
                type: 1,
                valid_from: "2025-01-01T00:00:00Z",
                code: "UPDATE",
            });
            jest.spyOn(ReferralCodeDto as any, "from").mockReturnValue(dto);
            const error = new Error("update failed");
            jest.spyOn(referralCodeService, "updateReferralCode").mockRejectedValue(error);
            const handleErrorSpy = jest.spyOn(Utility, "handleError").mockImplementation(() => undefined);

            const request = {
                params: { projectGroupId: "proj-999", code_id: "expected-id" },
                body: {},
                userId: "user-abc",
            } as unknown as Request & { userId: string };
            const response = createResponse();
            const next = createNext();

            await projectGroupController.updateReferralCode(request, response, next);

            expect(handleErrorSpy).toHaveBeenCalledWith(response, next, error, "Error updating referral code.");
        });
    });

    describe("deleteReferralCode", () => {
        test("responds with success when the service resolves", async () => {
            const deleteSpy = jest.spyOn(referralCodeService, "deleteReferralCode").mockResolvedValue(true);
            const okSpy = jest.spyOn(httpResponses, "Ok");

            const request = {
                params: { projectGroupId: "proj-111", code_id: "code-222" },
                userId: "user-xyz",
            } as unknown as Request & { userId: string };
            const response = createResponse();
            const next = createNext();

            await projectGroupController.deleteReferralCode(request, response, next);

            expect(deleteSpy).toHaveBeenCalledWith("proj-111", "code-222", "user-xyz");
            expect(okSpy).toHaveBeenCalledWith(response, true);
            expect(response.status).toHaveBeenCalledWith(200);
            expect(response.send).toHaveBeenCalledWith(true);
            expect(next).not.toHaveBeenCalled();
        });

        test("propagates deletion failures to the shared handler", async () => {
            const error = new Error("delete failed");
            jest.spyOn(referralCodeService, "deleteReferralCode").mockRejectedValue(error);
            const handleErrorSpy = jest.spyOn(Utility, "handleError").mockImplementation(() => undefined);

            const request = {
                params: { projectGroupId: "proj-111", code_id: "code-222" },
                userId: "user-xyz",
            } as unknown as Request & { userId: string };
            const response = createResponse();
            const next = createNext();

            await projectGroupController.deleteReferralCode(request, response, next);

            expect(handleErrorSpy).toHaveBeenCalledWith(response, next, error, "Error deleting referral code.");
        });
    });
});
