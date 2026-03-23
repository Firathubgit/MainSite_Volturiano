-- add website metadata columns
ALTER TABLE published_sites 
ADD COLUMN site_title TEXT,
ADD COLUMN site_description TEXT,
ADD COLUMN site_icon_url TEXT;
