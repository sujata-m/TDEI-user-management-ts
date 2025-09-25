import "reflect-metadata";
import { validate } from "class-validator";
import { ReferralCodeDto } from "../../src/model/dto/referral-code-dto";

describe("ReferralCodeDto validation", () => {
    test("fails validation when required fields are missing", async () => {
        const dto = new ReferralCodeDto();

        const errors = await validate(dto);
        const properties = errors.map((error) => error.property);

        expect(properties).toEqual(expect.arrayContaining(["name", "type", "valid_from", "code"]));
    });

    test("captures validation errors for invalid values", async () => {
        const dto = new ReferralCodeDto({
            id: "too-short",
            name: "",
            type: 3 as any,
            valid_from: "not-a-date",
            code: "x".repeat(101),
            valid_to: "still-not-a-date",
            instructions_url: "invalid-url",
            description: "x".repeat(1001),
            project_group_id: "proj-1",
            user_id: "user-1",
            is_active: "yes" as any,
        });

        const errors = await validate(dto);
        const properties = errors.map((error) => error.property);

        expect(properties).toEqual(
            expect.arrayContaining([
                "id",
                "name",
                "type",
                "valid_from",
                "code",
                "valid_to",
                "instructions_url",
                "description",
                "project_group_id",
                "user_id",
                "is_active",
            ]),
        );
    });

    test("passes validation for a fully populated referral code", async () => {
        const dto = new ReferralCodeDto({
            id: "123e4567-e89b-12d3-a456-426614174000",
            name: "Fall Special",
            type: 2,
            valid_from: "2025-10-01T00:00:00Z",
            code: "FALL25",
            valid_to: "2025-11-30T23:59:59Z",
            instructions_url: "https://example.com/fall",
            description: "Seasonal promotion",
            project_group_id: "123e4567-e89b-12d3-a456-426614174000",
            user_id: "223e4567-e89b-12d3-a456-426614174111",
            created_at: "2025-09-01T00:00:00Z",
            updated_at: "2025-09-15T00:00:00Z",
            is_active: true,
        });

        const errors = await validate(dto);

        expect(errors).toHaveLength(0);
    });
});
