-- Migration: Add Projects table and Budget Type enhancements
-- Purpose: Implement Project-Based Grouping and CapEx/OpEx Segregation

-- ============================================================================
-- PART 1: Create budget_category_type enum
-- ============================================================================
DO $$ BEGIN
    CREATE TYPE budget_category_type AS ENUM ('CAPEX', 'OPEX', 'BOTH');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- PART 2: Create Projects table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    department department NOT NULL,
    description TEXT,
    created_by UUID REFERENCES public.users(id),
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_projects_project_code ON public.projects(project_code);
CREATE INDEX IF NOT EXISTS idx_projects_department ON public.projects(department);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON public.projects(created_by);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies for projects
CREATE POLICY "Users can view projects in their department" 
    ON public.projects FOR SELECT 
    USING (
        department = (SELECT department FROM public.users WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('superadmin', 'approver', 'reviewer'))
    );

CREATE POLICY "Users can create projects" 
    ON public.projects FOR INSERT 
    WITH CHECK (
        created_by = auth.uid()
    );

CREATE POLICY "Users can update their own projects" 
    ON public.projects FOR UPDATE 
    USING (
        created_by = auth.uid() 
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'superadmin')
    );

-- ============================================================================
-- PART 3: Create sequences for custom budget IDs
-- ============================================================================
CREATE SEQUENCE IF NOT EXISTS public.capex_id_seq START WITH 1;
CREATE SEQUENCE IF NOT EXISTS public.opex_id_seq START WITH 1;

-- ============================================================================
-- PART 4: Alter budget_requests (budgets) table
-- ============================================================================

-- Add project_id column (nullable to support existing records)
ALTER TABLE public.budgets 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id);

-- Add custom_id column for CAP-XXXX / OPX-XXXX format
ALTER TABLE public.budgets 
ADD COLUMN IF NOT EXISTS custom_id TEXT;

-- Create unique index on custom_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_budgets_custom_id ON public.budgets(custom_id) WHERE custom_id IS NOT NULL;

-- Create index for project lookups
CREATE INDEX IF NOT EXISTS idx_budgets_project_id ON public.budgets(project_id);

-- ============================================================================
-- PART 5: Create budget_categories table with allowed_type
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.budget_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    allowed_type budget_category_type NOT NULL DEFAULT 'BOTH',
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Insert default categories with their allowed types
INSERT INTO public.budget_categories (name, description, allowed_type) VALUES
    ('Heavy Machinery', 'Large industrial equipment and machinery', 'CAPEX'),
    ('Vehicles', 'Company vehicles and transport equipment', 'CAPEX'),
    ('Buildings & Infrastructure', 'Real estate and structural improvements', 'CAPEX'),
    ('IT Equipment', 'Computers, servers, and hardware', 'CAPEX'),
    ('Software Licenses (Perpetual)', 'Permanent software licenses', 'CAPEX'),
    ('Office Supplies', 'Day-to-day office consumables', 'OPEX'),
    ('Utilities', 'Electricity, water, internet services', 'OPEX'),
    ('Maintenance & Repairs', 'Routine maintenance and repairs', 'OPEX'),
    ('Software Subscriptions', 'Monthly/yearly software subscriptions', 'OPEX'),
    ('Professional Services', 'Consulting, legal, accounting services', 'OPEX'),
    ('Travel & Transportation', 'Business travel expenses', 'OPEX'),
    ('Training & Development', 'Employee training programs', 'OPEX'),
    ('Labor', 'Workforce and staffing costs', 'BOTH'),
    ('Materials', 'Raw materials and supplies', 'BOTH'),
    ('Equipment', 'General equipment (context-dependent)', 'BOTH'),
    ('Services', 'General services', 'BOTH'),
    ('Testing', 'Quality assurance and testing', 'BOTH'),
    ('Installation', 'Installation and setup costs', 'BOTH'),
    ('Parts', 'Replacement parts and components', 'BOTH')
ON CONFLICT (name) DO UPDATE SET
    allowed_type = EXCLUDED.allowed_type,
    description = EXCLUDED.description;

-- Enable RLS for budget_categories
ALTER TABLE public.budget_categories ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read categories
CREATE POLICY "Anyone can view categories" 
    ON public.budget_categories FOR SELECT 
    USING (true);

-- ============================================================================
-- PART 6: Create function to generate custom budget IDs
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_budget_custom_id()
RETURNS TRIGGER AS $$
DECLARE
    next_seq INTEGER;
    prefix TEXT;
BEGIN
    -- Determine prefix based on budget_type
    IF NEW.budget_type = 'capex' THEN
        prefix := 'CAP';
        next_seq := nextval('public.capex_id_seq');
    ELSE
        prefix := 'OPX';
        next_seq := nextval('public.opex_id_seq');
    END IF;
    
    -- Format: CAP-0001 or OPX-0001
    NEW.custom_id := prefix || '-' || LPAD(next_seq::TEXT, 4, '0');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate custom_id on insert
DROP TRIGGER IF EXISTS trigger_generate_budget_custom_id ON public.budgets;
CREATE TRIGGER trigger_generate_budget_custom_id
    BEFORE INSERT ON public.budgets
    FOR EACH ROW
    WHEN (NEW.custom_id IS NULL)
    EXECUTE FUNCTION generate_budget_custom_id();

-- ============================================================================
-- PART 7: Backfill existing budgets with custom_id
-- ============================================================================
DO $$
DECLARE
    budget_record RECORD;
    next_seq INTEGER;
    prefix TEXT;
BEGIN
    FOR budget_record IN 
        SELECT id, budget_type 
        FROM public.budgets 
        WHERE custom_id IS NULL 
        ORDER BY created_at ASC
    LOOP
        IF budget_record.budget_type = 'capex' THEN
            prefix := 'CAP';
            next_seq := nextval('public.capex_id_seq');
        ELSE
            prefix := 'OPX';
            next_seq := nextval('public.opex_id_seq');
        END IF;
        
        UPDATE public.budgets 
        SET custom_id = prefix || '-' || LPAD(next_seq::TEXT, 4, '0')
        WHERE id = budget_record.id;
    END LOOP;
END $$;

-- ============================================================================
-- PART 8: Create project code sequence and function
-- ============================================================================
CREATE SEQUENCE IF NOT EXISTS public.project_code_seq START WITH 1;

CREATE OR REPLACE FUNCTION generate_project_code()
RETURNS TEXT AS $$
DECLARE
    current_year TEXT;
    next_seq INTEGER;
BEGIN
    current_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    next_seq := nextval('public.project_code_seq');
    RETURN 'PROJ-' || current_year || '-' || LPAD(next_seq::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 9: Helper function to get next custom ID preview
-- ============================================================================
CREATE OR REPLACE FUNCTION get_next_budget_id_preview(p_budget_type TEXT)
RETURNS TEXT AS $$
DECLARE
    next_seq INTEGER;
    prefix TEXT;
BEGIN
    IF p_budget_type = 'capex' THEN
        prefix := 'CAP';
        -- Get current value + 1 without consuming the sequence
        SELECT COALESCE(last_value, 0) + 1 INTO next_seq FROM public.capex_id_seq;
    ELSE
        prefix := 'OPX';
        SELECT COALESCE(last_value, 0) + 1 INTO next_seq FROM public.opex_id_seq;
    END IF;
    
    RETURN prefix || '-' || LPAD(next_seq::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;
