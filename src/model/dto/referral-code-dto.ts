import { IsBoolean, IsDateString, IsIn, IsNotEmpty, IsOptional, IsUrl, Length, MaxLength } from "class-validator";
import { Prop } from "nodets-ms-core/lib/models";
import { BaseDto } from "./base-dto";

export class ReferralCodeDto extends BaseDto {
    @Prop()
    @Length(36, 36, {
        message: 'id must be 36 characters long (UUID)',
    })
    @IsOptional()
    id?: string;

    @Prop()
    @IsNotEmpty()
    @MaxLength(255)
    name!: string;

    @Prop()
    @IsNotEmpty()
    @IsIn([1, 2], {
        message: 'type must be either 1 or 2',
    })
    type!: number;

    @Prop()
    @IsNotEmpty()
    @IsDateString()
    valid_from!: string;

    @Prop()
    @IsOptional()
    @IsDateString()
    valid_to?: string | null;

    @Prop()
    @IsNotEmpty()
    @MaxLength(100)
    code!: string;

    @Prop()
    @IsOptional()
    @IsUrl()
    @MaxLength(2048)
    instructions_url?: string | null;

    @Prop()
    @IsOptional()
    @MaxLength(1000)
    description?: string | null;

    @Prop("project_group_id")
    @Length(36, 36, {
        message: 'project_group_id must be 36 characters long (UUID)',
    })
    @IsOptional()
    project_group_id?: string;

    @Prop("user_id")
    @Length(36, 36, {
        message: 'user_id must be 36 characters long (UUID)',
    })
    @IsOptional()
    user_id?: string;

    @Prop("created_at")
    @IsOptional()
    @IsDateString()
    created_at?: string;

    @Prop("updated_at")
    @IsOptional()
    @IsDateString()
    updated_at?: string;

    @Prop("is_active")
    @IsOptional()
    @IsBoolean()
    is_active?: boolean;

    constructor(init?: Partial<ReferralCodeDto>) {
        super();
        Object.assign(this, init);
    }
}
