-- Enable Row Level Security (RLS) on core tables

-- 1. Enable RLS on core schemas
ALTER TABLE sales_engine.fact_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity.roles ENABLE ROW LEVEL SECURITY;

-- 2. Create Policies for identity
-- Allow authenticated users to read their own user data
CREATE POLICY "Users can read own data" ON identity.users
    FOR SELECT
    USING (auth.uid() = id);

-- 3. Create Policies for sales_engine
-- Allow authenticated users to read sales data
CREATE POLICY "Authenticated users can read sales data" ON sales_engine.fact_sales
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert sales data
CREATE POLICY "Authenticated users can insert sales data" ON sales_engine.fact_sales
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');
