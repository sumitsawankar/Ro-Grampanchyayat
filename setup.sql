-- Run this in the Supabase SQL Editor to create your database!

-- Members Table (Villagers / Consumers)
CREATE TABLE IF NOT EXISTS public.members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  house_number text NOT NULL UNIQUE,
  name text NOT NULL,
  address text NOT NULL,
  phone text NOT NULL,
  aadhar_number text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tickets Table (Water Can Requests)
CREATE TABLE IF NOT EXISTS public.tickets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  house_number text NOT NULL,
  name text NOT NULL,
  address text NOT NULL,
  phone text NOT NULL,
  request_type text NOT NULL DEFAULT 'Daily', -- 'Daily' or 'Monthly'
  number_of_cans integer NOT NULL DEFAULT 1,  -- For Daily (1-20) or Monthly (15, 30, 60)
  status text NOT NULL DEFAULT 'Pending',     -- 'Pending' or 'Fulfilled'
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) and allow public access
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous read members" ON public.members FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert members" ON public.members FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update members" ON public.members FOR UPDATE USING (true);

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous read tickets" ON public.tickets FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert tickets" ON public.tickets FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update tickets" ON public.tickets FOR UPDATE USING (true);

