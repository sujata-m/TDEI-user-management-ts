CREATE TABLE IF NOT EXISTS public.promo_referrals
(
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name character varying(255) COLLATE pg_catalog."default" NOT NULL,
    type integer NOT NULL,
    valid_from timestamp with time zone NOT NULL,
    code character varying(100) COLLATE pg_catalog."default" NOT NULL,
    valid_to timestamp with time zone,
    instructions_url character varying(2048) COLLATE pg_catalog."default",
    project_group_id character varying(100) COLLATE pg_catalog."default" NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    description text COLLATE pg_catalog."default",
    is_active boolean NOT NULL DEFAULT true,
    CONSTRAINT promo_referrals_pkey PRIMARY KEY (id),
    CONSTRAINT fk_promo_referrals_project_group FOREIGN KEY (project_group_id)
        REFERENCES public.project_group (project_group_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
);

CREATE UNIQUE INDEX IF NOT EXISTS unq_promo_referrals_code
    ON public.promo_referrals USING btree
    (code COLLATE pg_catalog."default");

CREATE INDEX IF NOT EXISTS idx_promo_referrals_project_group
    ON public.promo_referrals USING btree
    (project_group_id COLLATE pg_catalog."default");
