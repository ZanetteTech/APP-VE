
-- Force add notified column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_requests' AND column_name = 'notified') THEN
        ALTER TABLE public.app_requests ADD COLUMN notified BOOLEAN DEFAULT FALSE;
    END IF;
END $$;
