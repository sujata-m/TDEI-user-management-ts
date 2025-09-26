import "reflect-metadata";
import { validate } from "class-validator";
import { ReferralCodeQueryParams } from "../../src/model/params/referral-code-query-params";

describe("ReferralCodeQueryParams validation", () => {
    test("provides defaults for paging when no values supplied", async () => {
        const params = new ReferralCodeQueryParams();

        const errors = await validate(params);

        expect(errors).toHaveLength(0);
        expect(params.page_no).toBe(1);
        expect(params.page_size).toBe(10);
    });

    test("accepts valid filters", async () => {
        const params = new ReferralCodeQueryParams({
            type: "2",
            name: "Autumn Promo",
            code: "FALL",
            page_no: 3,
            page_size: 25,
        });

        const errors = await validate(params);

        expect(errors).toHaveLength(0);
    });

    test("rejects unsupported type values", async () => {
        const params = new ReferralCodeQueryParams({
            type: 5 as any,
        });

        const errors = await validate(params);

        expect(errors).toHaveLength(1);
        expect(errors[0].property).toBe("type");
    });

    test("enforces length limits on name and code", async () => {
        const params = new ReferralCodeQueryParams({
            name: "x".repeat(256),
            code: "y".repeat(101),
        });

        const errors = await validate(params);
        const properties = errors.map((error) => error.property);

        expect(properties).toEqual(expect.arrayContaining(["name", "code"]));
    });
});

describe("ReferralCodeQueryParams query building", () => {
    test("builds count and list queries with sanitized filters", () => {
        const params = new ReferralCodeQueryParams({
            type: "1",
            name: "  Example  ",
            code: " CODE  ",
            page_no: 2,
            page_size: 80,
        });

        const countQuery = params.getCountQueryObject("proj-group");
        expect(countQuery.getQuery()).toContain("SELECT COUNT(*)::int AS total FROM promo_referrals");
        expect(countQuery.getValues()).toEqual([
            "proj-group",
            true,
            1,
            "%Example%",
            "%CODE%",
        ]);

        const listQuery = params.getListQueryObject("proj-group");
        expect(listQuery.getQuery()).toContain("SELECT id,name,type,valid_from");
        expect(listQuery.getQuery()).toContain("ORDER BY created_at DESC");
        expect(listQuery.getQuery()).toContain("LIMIT $");
        expect(listQuery.getQuery()).toContain("OFFSET $");
        expect(listQuery.getValues()).toEqual([
            "proj-group",
            true,
            1,
            "%Example%",
            "%CODE%",
            50,
            50,
        ]);

        expect(params.page_no).toBe(2);
        expect(params.page_size).toBe(50);
    });
});
