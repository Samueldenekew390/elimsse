-- ============================================================================
-- E-LMIS AUE Database Schema & Security Architecture
-- Production PostgreSQL configuration for Supabase
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. APPLICANTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.applicants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    otp TEXT UNIQUE NOT NULL,
    registration_type TEXT NOT NULL CHECK (registration_type IN ('eligible', 'ineligible')),
    country TEXT NOT NULL CHECK (country IN ('Dubai', 'Kuwait', 'Qatar', 'Saudi Arabia')),
    full_name TEXT NOT NULL,
    gender TEXT NOT NULL CHECK (gender IN ('ወንድ', 'ሴት', 'Male', 'Female')),
    email TEXT,
    mobile_number TEXT NOT NULL,
    address TEXT NOT NULL,
    facebook_id TEXT,
    photo_path TEXT,
    date_of_birth DATE,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    admin_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance and uniqueness
CREATE INDEX IF NOT EXISTS idx_applicants_otp ON public.applicants (otp);
CREATE INDEX IF NOT EXISTS idx_applicants_status ON public.applicants (status);
CREATE INDEX IF NOT EXISTS idx_applicants_country ON public.applicants (country);
CREATE INDEX IF NOT EXISTS idx_applicants_mobile ON public.applicants (mobile_number);
CREATE INDEX IF NOT EXISTS idx_applicants_email ON public.applicants (email);

-- ============================================================================
-- 2. APPLICANT JOBS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.applicant_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    applicant_id UUID NOT NULL REFERENCES public.applicants(id) ON DELETE CASCADE,
    job_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_applicant_jobs_applicant_id ON public.applicant_jobs (applicant_id);

-- ============================================================================
-- 3. PAYMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    applicant_id UUID NOT NULL REFERENCES public.applicants(id) ON DELETE CASCADE,
    payment_type TEXT NOT NULL CHECK (payment_type IN ('registration', 'processing', 'bank_statement')),
    amount NUMERIC NOT NULL,
    bank_account TEXT NOT NULL,
    receipt_path TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    admin_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_applicant_id ON public.payments (applicant_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments (status);
CREATE INDEX IF NOT EXISTS idx_payments_type ON public.payments (payment_type);

-- ============================================================================
-- 4. JOB OFFERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.job_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    applicant_id UUID NOT NULL REFERENCES public.applicants(id) ON DELETE CASCADE,
    country TEXT NOT NULL,
    job_title TEXT NOT NULL,
    description TEXT,
    image_path TEXT,
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Archived', 'Pending')),
    admin_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_offers_applicant_id ON public.job_offers (applicant_id);

-- ============================================================================
-- 5. FINGERPRINT STATUS TABLE (5 Fingerprint / የአምስት ጣት ምልክት)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.fingerprint_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    applicant_id UUID NOT NULL UNIQUE REFERENCES public.applicants(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'Not Scheduled' CHECK (status IN ('Not Scheduled', 'Scheduled', 'Completed', 'Pending Verification')),
    appointment_date TIMESTAMPTZ,
    location TEXT,
    notes TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fingerprint_applicant_id ON public.fingerprint_status (applicant_id);

-- ============================================================================
-- 6. BANK STATEMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.bank_statements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    applicant_id UUID NOT NULL REFERENCES public.applicants(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL DEFAULT 46300,
    bank_account TEXT NOT NULL,
    receipt_path TEXT,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_statements_applicant_id ON public.bank_statements (applicant_id);

-- ============================================================================
-- 7. VISA APPLICATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.visa_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    applicant_id UUID NOT NULL REFERENCES public.applicants(id) ON DELETE CASCADE,
    country TEXT NOT NULL CHECK (country IN ('Dubai', 'Kuwait', 'Qatar', 'Saudi Arabia')),
    form_date DATE DEFAULT CURRENT_DATE,
    nationality TEXT NOT NULL DEFAULT 'Ethiopian',
    visa_type TEXT NOT NULL DEFAULT 'Work Visa',
    city TEXT,
    current_address TEXT,
    state_province TEXT,
    country_code TEXT DEFAULT '+251',
    mobile_number TEXT,
    whatsapp_number TEXT,
    travel_date DATE,
    email TEXT,
    first_name TEXT,
    last_name TEXT,
    date_of_birth DATE,
    passport_number TEXT,
    passport_expiry_date DATE,
    bail TEXT,
    signature_data TEXT,
    status TEXT NOT NULL DEFAULT 'Submitted' CHECK (status IN ('Draft', 'Submitted', 'Pending', 'Approved', 'Rejected')),
    admin_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visa_applications_applicant_id ON public.visa_applications (applicant_id);
CREATE INDEX IF NOT EXISTS idx_visa_applications_status ON public.visa_applications (status);

-- ============================================================================
-- 8. ELECTRONIC VISAS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.electronic_visas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    applicant_id UUID NOT NULL REFERENCES public.applicants(id) ON DELETE CASCADE,
    visa_application_id UUID REFERENCES public.visa_applications(id) ON DELETE SET NULL,
    verification_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    photo_path TEXT,
    passport_number TEXT,
    gender TEXT,
    visa_date DATE DEFAULT CURRENT_DATE,
    country TEXT NOT NULL,
    visa_type TEXT NOT NULL DEFAULT 'Work Visa',
    travel_date DATE,
    issue_date DATE DEFAULT CURRENT_DATE,
    expiry_date DATE,
    status TEXT NOT NULL DEFAULT 'Approved' CHECK (status IN ('Approved', 'Suspended', 'Expired')),
    qr_payload TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_electronic_visas_verification_code ON public.electronic_visas (verification_code);
CREATE INDEX IF NOT EXISTS idx_electronic_visas_applicant_id ON public.electronic_visas (applicant_id);

-- ============================================================================
-- 8B. APPOINTMENTS TABLE (Multi-Stage Workflow: 3800 ETB, Job Offer, Bank Statement, Visa)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    applicant_id UUID NOT NULL REFERENCES public.applicants(id) ON DELETE CASCADE,
    stage TEXT NOT NULL CHECK (stage IN ('registration_fee', 'job_offer', 'bank_statement', 'visa')),
    stage_label TEXT NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TEXT NOT NULL,
    location TEXT NOT NULL DEFAULT 'E-LMIS AUE Main Office, Addis Ababa',
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'Completed', 'Cancelled', 'Rescheduled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_applicant_id ON public.appointments (applicant_id);
CREATE INDEX IF NOT EXISTS idx_appointments_stage ON public.appointments (stage);

-- ============================================================================
-- 9. SETTINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key TEXT UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default application settings
INSERT INTO public.settings (setting_key, setting_value) VALUES
    ('phone_number', '0924865172'),
    ('bank_account_number', '1000671389712'),
    ('registration_fee', '3800'),
    ('processing_fee', '18200'),
    ('bank_statement_fee', '46300'),
    ('website_name', 'E-LMIS AUE'),
    ('hero_title', 'E-LMIS AUE'),
    ('hero_description', 'የስራ እድል ምዝገባ እና አመልካች አስተዳደር ስርዓት'),
    ('bank_statement_text', 'ተመላሽ ክፍያ (Refundable Payment)'),
    ('footer_text', 'E-LMIS AUE የስራ እድል ምዝገባ እና አመልካች አስተዳደር ስርዓት')
ON CONFLICT (setting_key) DO NOTHING;

-- ============================================================================
-- 10. ADMIN PROFILES & ROLES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.admin_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'reviewer' CHECK (role IN ('super_admin', 'admin', 'reviewer')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_profiles_user_id ON public.admin_profiles (user_id);

-- ============================================================================
-- 11. ADMIN ACTIVITY LOGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_type TEXT,
    target_id TEXT,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 12. HELPER FUNCTIONS & RPC PROCEDURES
-- ============================================================================

-- Check if current authenticated user is an active admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.admin_profiles
        WHERE user_id = auth.uid()
          AND is_active = TRUE
          AND role IN ('super_admin', 'admin', 'reviewer')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.admin_profiles
        WHERE user_id = auth.uid()
          AND is_active = TRUE
          AND role = 'super_admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Generate a cryptographically secure, unique applicant OTP
-- Format: AUE-XXXXXX (6 alphanumeric characters, excluding confusing chars 0, O, 1, I)
CREATE OR REPLACE FUNCTION public.generate_unique_applicant_otp()
RETURNS TEXT AS $$
DECLARE
    chars CONSTANT TEXT := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    generated_code TEXT;
    candidate_otp TEXT;
    char_len INT := length(chars);
    i INT;
    collision_count INT := 0;
BEGIN
    LOOP
        generated_code := '';
        FOR i IN 1..6 LOOP
            generated_code := generated_code || substr(chars, floor(random() * char_len + 1)::int, 1);
        END LOOP;
        
        candidate_otp := 'AUE-' || generated_code;
        
        -- Check uniqueness against applicants table
        IF NOT EXISTS (SELECT 1 FROM public.applicants WHERE otp = candidate_otp) THEN
            RETURN candidate_otp;
        END IF;

        collision_count := collision_count + 1;
        IF collision_count > 50 THEN
            RAISE EXCEPTION 'Could not generate unique OTP after 50 attempts';
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Function: Regenerate unique OTP for an existing applicant (Admin only)
CREATE OR REPLACE FUNCTION public.regenerate_applicant_otp(target_applicant_id UUID)
RETURNS TEXT AS $$
DECLARE
    new_otp TEXT;
BEGIN
    -- Verify admin permissions
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: only active administrators can regenerate OTPs.';
    END IF;

    -- Generate new unique OTP
    new_otp := public.generate_unique_applicant_otp();

    -- Update applicant
    UPDATE public.applicants
    SET otp = new_otp,
        updated_at = NOW()
    WHERE id = target_applicant_id;

    -- Log activity
    INSERT INTO public.admin_activity_logs (admin_user_id, action, target_type, target_id, description)
    VALUES (auth.uid(), 'REGENERATE_OTP', 'applicant', target_applicant_id::text, 'Regenerated OTP to ' || new_otp);

    RETURN new_otp;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Securely lookup applicant profile and related records by OTP
-- Crucial Security: Exposes only the matching applicant's data, without exposing arbitrary DB reads
CREATE OR REPLACE FUNCTION public.lookup_applicant_by_otp(input_otp TEXT)
RETURNS JSON AS $$
DECLARE
    v_applicant RECORD;
    v_jobs JSON;
    v_payments JSON;
    v_job_offer JSON;
    v_fingerprint JSON;
    v_visa JSON;
    v_electronic_visa JSON;
    v_appointments JSON;
    clean_otp TEXT;
BEGIN
    clean_otp := UPPER(TRIM(input_otp));

    SELECT * INTO v_applicant
    FROM public.applicants
    WHERE otp = clean_otp;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'ምንም መረጃ አልተገኘም። እባክዎ ያስገቡትን OTP ያረጋግጡ።');
    END IF;

    -- Jobs
    SELECT COALESCE(json_agg(json_build_object(
        'id', id,
        'job_name', job_name
    )), '[]'::json) INTO v_jobs
    FROM public.applicant_jobs
    WHERE applicant_id = v_applicant.id;

    -- Payments
    SELECT COALESCE(json_agg(json_build_object(
        'id', id,
        'payment_type', payment_type,
        'amount', amount,
        'bank_account', bank_account,
        'receipt_path', receipt_path,
        'status', status,
        'created_at', created_at
    ) ORDER BY created_at DESC), '[]'::json) INTO v_payments
    FROM public.payments
    WHERE applicant_id = v_applicant.id;

    -- Active Job Offer
    SELECT row_to_json(jo) INTO v_job_offer
    FROM (
        SELECT id, country, job_title, description, image_path, status, created_at
        FROM public.job_offers
        WHERE applicant_id = v_applicant.id
        ORDER BY created_at DESC
        LIMIT 1
    ) jo;

    -- Fingerprint Status
    SELECT row_to_json(fp) INTO v_fingerprint
    FROM (
        SELECT status, appointment_date, location, notes, updated_at
        FROM public.fingerprint_status
        WHERE applicant_id = v_applicant.id
    ) fp;

    -- Visa Application
    SELECT row_to_json(va) INTO v_visa
    FROM (
        SELECT id, country, form_date, nationality, visa_type, city, travel_date, status, created_at
        FROM public.visa_applications
        WHERE applicant_id = v_applicant.id
        ORDER BY created_at DESC
        LIMIT 1
    ) va;

    -- Electronic Visa
    SELECT row_to_json(ev) INTO v_electronic_visa
    FROM (
        SELECT id, verification_code, name, photo_path, country, visa_type, travel_date, issue_date, expiry_date, status
        FROM public.electronic_visas
        WHERE applicant_id = v_applicant.id AND status = 'Approved'
        ORDER BY created_at DESC
        LIMIT 1
    ) ev;

    -- Appointments (Multi-Stage Workflow: 3800 ETB, Job Offer, Bank Statement, Visa)
    SELECT COALESCE(json_agg(json_build_object(
        'id', id,
        'stage', stage,
        'stage_label', stage_label,
        'appointment_date', appointment_date,
        'appointment_time', appointment_time,
        'location', location,
        'notes', notes,
        'status', status,
        'created_at', created_at
    ) ORDER BY created_at ASC), '[]'::json) INTO v_appointments
    FROM public.appointments
    WHERE applicant_id = v_applicant.id;

    RETURN json_build_object(
        'success', true,
        'applicant', json_build_object(
            'id', v_applicant.id,
            'otp', v_applicant.otp,
            'full_name', v_applicant.full_name,
            'gender', v_applicant.gender,
            'email', v_applicant.email,
            'mobile_number', v_applicant.mobile_number,
            'address', v_applicant.address,
            'country', v_applicant.country,
            'facebook_id', v_applicant.facebook_id,
            'photo_path', v_applicant.photo_path,
            'date_of_birth', v_applicant.date_of_birth,
            'registration_type', v_applicant.registration_type,
            'status', v_applicant.status,
            'created_at', v_applicant.created_at
        ),
        'jobs', v_jobs,
        'payments', v_payments,
        'job_offer', v_job_offer,
        'fingerprint', v_fingerprint,
        'visa', v_visa,
        'electronic_visa', v_electronic_visa,
        'appointments', v_appointments
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Verify electronic visa by public verification code
-- Exposes ONLY non-sensitive validation details (no passport, email, or phone)
CREATE OR REPLACE FUNCTION public.verify_electronic_visa(input_code TEXT)
RETURNS JSON AS $$
DECLARE
    v_record RECORD;
    clean_code TEXT;
BEGIN
    clean_code := UPPER(TRIM(input_code));

    SELECT 
        ev.verification_code,
        ev.name,
        ev.country,
        ev.visa_type,
        ev.travel_date,
        ev.issue_date,
        ev.expiry_date,
        ev.status,
        a.otp AS applicant_otp_masked
    INTO v_record
    FROM public.electronic_visas ev
    LEFT JOIN public.applicants a ON a.id = ev.applicant_id
    WHERE ev.verification_code = clean_code;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'ትክክለኛ የቪዛ ማረጋገጫ ኮድ አልተገኘም።');
    END IF;

    RETURN json_build_object(
        'success', true,
        'verification', json_build_object(
            'verification_code', v_record.verification_code,
            'name', v_record.name,
            'country', v_record.country,
            'visa_type', v_record.visa_type,
            'issue_date', v_record.issue_date,
            'expiry_date', v_record.expiry_date,
            'travel_date', v_record.travel_date,
            'status', v_record.status
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 13. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.applicants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applicant_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fingerprint_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visa_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.electronic_visas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;

-- Applicants RLS:
-- Public can INSERT their registration
CREATE POLICY "Public applicants can register"
    ON public.applicants FOR INSERT
    WITH CHECK (true);

-- Public can view limited status card information for approved/pending listings
CREATE POLICY "Public can view limited applicant statuses"
    ON public.applicants FOR SELECT
    USING (true);

-- Admins can update or delete
CREATE POLICY "Admins full management on applicants"
    ON public.applicants FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Applicant Jobs RLS:
CREATE POLICY "Public can insert applicant jobs"
    ON public.applicant_jobs FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Public can view applicant jobs"
    ON public.applicant_jobs FOR SELECT
    USING (true);

CREATE POLICY "Admins full management on applicant jobs"
    ON public.applicant_jobs FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Payments RLS:
CREATE POLICY "Public can insert payments"
    ON public.payments FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Admins full management on payments"
    ON public.payments FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Job Offers RLS:
CREATE POLICY "Public can select job offers"
    ON public.job_offers FOR SELECT
    USING (true);

CREATE POLICY "Admins full management on job offers"
    ON public.job_offers FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Fingerprint Status RLS:
CREATE POLICY "Public can select fingerprint status"
    ON public.fingerprint_status FOR SELECT
    USING (true);

CREATE POLICY "Admins full management on fingerprint status"
    ON public.fingerprint_status FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Bank Statements RLS:
CREATE POLICY "Public can insert bank statements"
    ON public.bank_statements FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Admins full management on bank statements"
    ON public.bank_statements FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Visa Applications RLS:
CREATE POLICY "Public can insert visa applications"
    ON public.visa_applications FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Admins full management on visa applications"
    ON public.visa_applications FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Electronic Visas RLS:
CREATE POLICY "Public can read electronic visas"
    ON public.electronic_visas FOR SELECT
    USING (true);

CREATE POLICY "Admins full management on electronic visas"
    ON public.electronic_visas FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Settings RLS:
-- Public can read site settings (phone, bank account number, fees)
CREATE POLICY "Public can read settings"
    ON public.settings FOR SELECT
    USING (true);

-- Admins can update settings
CREATE POLICY "Admins can update settings"
    ON public.settings FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Admin Profiles RLS:
CREATE POLICY "Users can read own admin profile"
    ON public.admin_profiles FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Super Admins can manage admin profiles"
    ON public.admin_profiles FOR ALL
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- Admin Activity Logs RLS:
CREATE POLICY "Admins can view activity logs"
    ON public.admin_activity_logs FOR SELECT
    USING (public.is_admin());

CREATE POLICY "Admins can insert activity logs"
    ON public.admin_activity_logs FOR INSERT
    WITH CHECK (public.is_admin());

-- Appointments RLS:
CREATE POLICY "Public can view appointments"
    ON public.appointments FOR SELECT
    USING (true);

CREATE POLICY "Admins full management on appointments"
    ON public.appointments FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ============================================================================
-- 14. SUPABASE STORAGE BUCKETS (Execute if permissions permit)
-- ============================================================================
INSERT INTO storage.buckets (id, name, public) VALUES
    ('applicant-photos', 'applicant-photos', true),
    ('payment-receipts', 'payment-receipts', true),
    ('job-offers', 'job-offers', true),
    ('visa-files', 'visa-files', true),
    ('signatures', 'signatures', true)
ON CONFLICT (id) DO NOTHING;

-- Storage bucket access policies
CREATE POLICY "Public Access To Photos" ON storage.objects FOR SELECT
    USING (bucket_id IN ('applicant-photos', 'payment-receipts', 'job-offers', 'visa-files', 'signatures'));

CREATE POLICY "Public Upload Access" ON storage.objects FOR INSERT
    WITH CHECK (bucket_id IN ('applicant-photos', 'payment-receipts', 'visa-files', 'signatures'));

CREATE POLICY "Admin Full Storage Access" ON storage.objects FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ============================================================================
-- 15. UPDATED_AT TRIGGER
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_applicants_updated ON public.applicants;
CREATE TRIGGER tr_applicants_updated
    BEFORE UPDATE ON public.applicants
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_payments_updated ON public.payments;
CREATE TRIGGER tr_payments_updated
    BEFORE UPDATE ON public.payments
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_settings_updated ON public.settings;
CREATE TRIGGER tr_settings_updated
    BEFORE UPDATE ON public.settings
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- ============================================================================
-- 16. SUPABASE REALTIME REPLICATION CONFIGURATION
-- ============================================================================
-- Add critical tables to the supabase_realtime publication to enable instant
-- live updates on the client without page refresh:
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.applicants;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.job_offers;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.fingerprint_status;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.electronic_visas;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.settings;
    END IF;
EXCEPTION WHEN duplicate_object THEN
    NULL; -- Already added
END $$;
