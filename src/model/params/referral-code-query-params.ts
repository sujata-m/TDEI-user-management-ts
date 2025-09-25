import { IsIn, IsOptional, MaxLength } from "class-validator";
import { AbstractDomainEntity, Prop } from "nodets-ms-core/lib/models";

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
}
