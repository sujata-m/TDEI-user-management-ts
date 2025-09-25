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
