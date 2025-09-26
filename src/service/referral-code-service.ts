import dbClient from "../database/data-source";
import UniqueKeyDbException from "../exceptions/db/database-exceptions";
import HttpException from "../exceptions/http/http-base-exception";
import { DuplicateException } from "../exceptions/http/http-exceptions";
import { ReferralCodeDto } from "../model/dto/referral-code-dto";
import { ReferralCodeQueryParams } from "../model/params/referral-code-query-params";
import { IReferralCodeService, ReferralCodeListResult } from "./interface/referral-code-interface";

class ReferralCodeService implements IReferralCodeService {
    async getReferralCodes(projectGroupId: string, params: ReferralCodeQueryParams): Promise<ReferralCodeListResult> {
        if (!projectGroupId) {
            throw new HttpException(400, "projectGroupId is required");
        }

        const sanitizedParams = new ReferralCodeQueryParams(params);

        const countQueryObject = sanitizedParams.getCountQueryObject(projectGroupId);
        const totalResult = await dbClient.query({
            text: countQueryObject.getQuery(),
            values: countQueryObject.getValues(),
        });
        const totalItems: number = totalResult.rows.length > 0 ? totalResult.rows[0].total : 0;

        const dataQueryObject = sanitizedParams.getListQueryObject(projectGroupId);
        const dataResult = await dbClient.query({
            text: dataQueryObject.getQuery(),
            values: dataQueryObject.getValues(),
        });
        const data = dataResult.rows.map(row => ReferralCodeDto.from(row));

        const pageNo = sanitizedParams.page_no;
        const take = sanitizedParams.page_size;
        const totalPages = take === 0 ? 0 : Math.ceil(totalItems / take);

        return {
            total_items: totalItems,
            per_page: take,
            current_page: pageNo,
            total_pages: totalPages,
            data,
        };
    }

    async createReferralCode(projectGroupId: string, referralCode: ReferralCodeDto, userId: string): Promise<ReferralCodeDto> {
        if (!userId) {
            throw new HttpException(400, "User context missing for creating referral code");
        }
        const normalized = this.normalizeReferralCodeInput(referralCode);
        normalized.project_group_id = projectGroupId;
        normalized.user_id = userId;

        const existingCode = await this.checkReferralCodeExists({ code: normalized.code });
        if (existingCode) {
            throw new HttpException(402, "Code already exists");
        }

        const query = {
            text: `INSERT INTO promo_referrals
                   (name, type, valid_from, code, valid_to, instructions_url, project_group_id, user_id, description, is_active)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
                   RETURNING id, name, type, valid_from, code, valid_to, instructions_url, project_group_id, user_id, created_at, updated_at, description, is_active`,
            values: [
                normalized.name,
                normalized.type,
                normalized.valid_from,
                normalized.code,
                normalized.valid_to ?? null,
                normalized.instructions_url ?? null,
                normalized.project_group_id,
                normalized.user_id,
                normalized.description ?? null,
            ],
        };

        try {
            const result = await dbClient.query(query);
            return ReferralCodeDto.from(result.rows[0]);
        }
        catch (error) {
            if (error instanceof UniqueKeyDbException) {
                throw new DuplicateException(`Referral code '${normalized.code}' already exists.`);
            }
            throw error;
        }
    }

    async updateReferralCode(projectGroupId: string, codeId: string, referralCode: ReferralCodeDto, userId: string): Promise<ReferralCodeDto> {
        if (!userId) {
            throw new HttpException(400, "User context missing for updating referral code");
        }
        if (!codeId) {
            throw new HttpException(400, "Referral code id is required");
        }

        await this.checkReferralCodeExists({ codeId, projectGroupId });

        const normalized = this.normalizeReferralCodeInput(referralCode);

        const existingCode = await this.checkReferralCodeExists({ code: normalized.code });
        if (existingCode && existingCode.id !== codeId) {
            throw new HttpException(402, "Code already exists");
        }

        const query = {
            text: `UPDATE promo_referrals
                   SET name = $1,
                       type = $2,
                       valid_from = $3,
                       code = $4,
                       valid_to = $5,
                       instructions_url = $6,
                       description = $7,
                       updated_at = now(),
                       user_id = $8
                   WHERE id = $9 AND project_group_id = $10 AND is_active = true
                   RETURNING id, name, type, valid_from, code, valid_to, instructions_url, project_group_id, user_id, created_at, updated_at, description, is_active`,
            values: [
                normalized.name,
                normalized.type,
                normalized.valid_from,
                normalized.code,
                normalized.valid_to ?? null,
                normalized.instructions_url ?? null,
                normalized.description ?? null,
                userId,
                codeId,
                projectGroupId,
            ],
        };

        try {
            const result = await dbClient.query(query);
            if (result.rows.length === 0) {
                throw new HttpException(404, "Referral code not found");
            }
            return ReferralCodeDto.from(result.rows[0]);
        }
        catch (error) {
            if (error instanceof UniqueKeyDbException) {
                throw new DuplicateException(`Referral code '${referralCode.code}' already exists.`);
            }
            throw error;
        }
    }

    async deleteReferralCode(projectGroupId: string, codeId: string, userId: string): Promise<boolean> {
        if (!userId) {
            throw new HttpException(400, "User context missing for deleting referral code");
        }
        if (!codeId) {
            throw new HttpException(400, "Referral code id is required");
        }

        const query = {
            text: `UPDATE promo_referrals
                   SET is_active = false,
                       updated_at = now(),
                       user_id = $3
                   WHERE id = $1 AND project_group_id = $2 AND is_active = true`,
            values: [codeId, projectGroupId, userId],
        };

        const result = await dbClient.query(query);
        if (result.rowCount === 0) {
            throw new HttpException(404, "Referral code not found");
        }
        return true;
    }

    private async checkReferralCodeExists({
        codeId,
        projectGroupId,
        code,
    }: {
        codeId?: string;
        projectGroupId?: string;
        code?: string;
    }): Promise<{ id: string; is_active: boolean } | null> {
        let index = 1;
        const values: any[] = [];
        const conditions: string[] = [];

        if (codeId) {
            conditions.push(`id = $${index++}`);
            values.push(codeId);
        }

        if (projectGroupId) {
            conditions.push(`project_group_id = $${index++}`);
            values.push(projectGroupId);
        }

        if (code) {
            const trimmedCode = code.trim();
            conditions.push(`LOWER(code) = LOWER($${index++})`);
            values.push(trimmedCode);
        }

        if (conditions.length === 0) {
            return null;
        }

        const orderClause = code ? " ORDER BY is_active DESC" : "";

        const query = {
            text: `SELECT id, is_active FROM promo_referrals WHERE ${conditions.join(" AND ")}${orderClause} LIMIT 1`,
            values,
        };

        const result = await dbClient.query(query);

        if (codeId && (!result.rows.length || !result.rows[0].is_active)) {
            throw new HttpException(404, "Referral code not found");
        }

        return result.rows.length > 0 ? result.rows[0] : null;
    }

    private normalizeReferralCodeInput(referralCode: ReferralCodeDto): ReferralCodeDto {
        const normalized = new ReferralCodeDto(referralCode);
        normalized.name = referralCode.name?.trim() ?? "";
        normalized.code = referralCode.code?.trim() ?? "";
        normalized.valid_from = referralCode.valid_from?.toString().trim() ?? referralCode.valid_from;
        normalized.type = Number(referralCode.type);
        if (Number.isNaN(normalized.type)) {
            throw new HttpException(400, "type must be numeric");
        }

        if (normalized.type === 1) {
            normalized.valid_to = null;
        }
        else {
            const validToInput = referralCode.valid_to?.toString().trim();
            if (!validToInput) {
                throw new HttpException(400, "valid_to is required when type is limited time");
            }
            normalized.valid_to = validToInput;
        }

        if (normalized.valid_to) {
            const validFrom = new Date(normalized.valid_from);
            const validTo = new Date(normalized.valid_to);
            if (Number.isNaN(validFrom.getTime()) || Number.isNaN(validTo.getTime())) {
                throw new HttpException(400, "valid_from and valid_to must be valid ISO date strings");
            }
            if (validTo < validFrom) {
                throw new HttpException(400, "valid_to must be greater than or equal to valid_from");
            }
        }

        const instructions = referralCode.instructions_url?.toString().trim();
        normalized.instructions_url = instructions ? instructions : null;
        const description = referralCode.description?.toString().trim();
        normalized.description = description ? description : null;

        return normalized;
    }
}

const referralCodeService = new ReferralCodeService();
export default referralCodeService;
