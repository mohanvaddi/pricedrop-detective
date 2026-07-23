-- Run this in your Supabase SQL editor to enable the /setalert feature.
ALTER TABLE trackers ADD COLUMN IF NOT EXISTS alert_price INTEGER DEFAULT NULL;
