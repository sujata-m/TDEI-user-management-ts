import { IsIn, IsOptional, MaxLength } from "class-validator";
import { AbstractDomainEntity, Prop } from "nodets-ms-core/lib/models";
import { DynamicQueryObject, SqlORder } from "../../database/query-object";

export class ReferralCodeQueryParams extends AbstractDomainEntity {
    @IsOptional()
    @Prop()
    @IsIn([1, 2, '1', '2'], {
        message: 'type must be either 1 or 2',
    })
    type?: number | string;

    @IsOptional()
    @Prop()
    @MaxLength(255)
    name?: string;

    @IsOptional()
    @Prop()
    @MaxLength(100)
    code?: string;

    @IsOptional()
    @Prop()
    page_no: number = 1;

    @IsOptional()
    @Prop()
    page_size: number = 10;

    constructor(init?: Partial<ReferralCodeQueryParams>) {
        super();
        Object.assign(this, init);
    }

    getCountQueryObject(projectGroupId: string): DynamicQueryObject {
        const queryObject = new DynamicQueryObject();
        queryObject.buildSelectRaw("SELECT COUNT(*)::int AS total FROM promo_referrals");
        this.applyFilters(queryObject, projectGroupId);
        return queryObject;
    }

    getListQueryObject(projectGroupId: string): DynamicQueryObject {
        this.sanitizePagination();

        const queryObject = new DynamicQueryObject();
        queryObject.buildSelect("promo_referrals", [
            "id",
            "name",
            "type",
            "valid_from",
            "code",
            "valid_to",
            "instructions_url",
            "project_group_id",
            "user_id",
            "created_at",
            "updated_at",
            "description",
            "is_active",
        ]);
        this.applyFilters(queryObject, projectGroupId);
        queryObject.buildOrder("created_at", SqlORder.DESC);
        queryObject.buildPagination(this.page_no, this.page_size);
        return queryObject;
    }

    private applyFilters(queryObject: DynamicQueryObject, projectGroupId: string): void {
        queryObject.condition(` project_group_id = $${queryObject.paramCouter++} `, projectGroupId);
        queryObject.condition(` is_active = $${queryObject.paramCouter++} `, true);

        if (this.type !== undefined && this.type !== null) {
            const numericType = Number(this.type);
            if (!Number.isNaN(numericType)) {
                queryObject.condition(` type = $${queryObject.paramCouter++} `, numericType);
            }
        }

        const nameFilter = this.name?.toString().trim();
        if (nameFilter) {
            queryObject.condition(` name ILIKE $${queryObject.paramCouter++} `, `%${nameFilter}%`);
        }

        const codeFilter = this.code?.toString().trim();
        if (codeFilter) {
            queryObject.condition(` code ILIKE $${queryObject.paramCouter++} `, `%${codeFilter}%`);
        }
    }

    private sanitizePagination(): void {
        const pageNo = this.page_no && this.page_no > 0 ? this.page_no : 1;
        const requestedPageSize = this.page_size && this.page_size > 0 ? this.page_size : 10;

        this.page_no = pageNo;
        this.page_size = requestedPageSize > 50 ? 50 : requestedPageSize;
    }
}
