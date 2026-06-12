-- Add portfolio_pdf to existing asset_type enum
ALTER TYPE asset_type ADD VALUE IF NOT EXISTS 'portfolio_pdf';

-- New enum
DO $$ BEGIN
  CREATE TYPE portfolio_export_type AS ENUM ('full','by_type','by_country','custom','single_project');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS portfolio_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(255) NOT NULL,
  export_type portfolio_export_type NOT NULL,
  project_ids_included uuid[] NOT NULL DEFAULT '{}'::uuid[],
  sections_config jsonb NOT NULL,
  filter_config jsonb,
  language varchar(5) NOT NULL DEFAULT 'fr',
  output_cloudinary_id uuid REFERENCES cloudinary_assets(id),
  file_size_bytes integer,
  page_count integer,
  download_count integer NOT NULL DEFAULT 0,
  last_downloaded_at timestamp,
  generated_at timestamp NOT NULL DEFAULT now(),
  generated_by uuid NOT NULL REFERENCES users(id),
  notes text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS portfolio_exports_generated_by_idx ON portfolio_exports(generated_by);
CREATE INDEX IF NOT EXISTS portfolio_exports_generated_at_idx ON portfolio_exports(generated_at);

CREATE TABLE IF NOT EXISTS portfolio_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_singleton boolean NOT NULL DEFAULT true,
  company_tagline text,
  ceo_name varchar(255),
  ceo_title varchar(255),
  ceo_photo_cloudinary_id uuid REFERENCES cloudinary_assets(id),
  company_address text,
  phone_1 varchar(50),
  phone_2 varchar(50),
  email varchar(255),
  website varchar(255),
  facebook_url varchar(500),
  instagram_handle varchar(100),
  iso_cert_number varchar(100),
  iso_cert_expiry date,
  rse_label_level varchar(50),
  rse_label_expiry date,
  cover_background_color varchar(7) NOT NULL DEFAULT '#2D5A27',
  accent_color varchar(7) NOT NULL DEFAULT '#FFFFFF',
  updated_at timestamp NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES users(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS portfolio_settings_singleton_uidx ON portfolio_settings(is_singleton);

INSERT INTO portfolio_settings (is_singleton) VALUES (true) ON CONFLICT DO NOTHING;
