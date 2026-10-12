-- Migration: Unpublish legacy tour products on WingsGo (site_id = 2, id < 112)
-- Date: 2026-10-12
-- Target: WingsGo (wingsgo.vn)

BEGIN;

-- 1. Unpublish Tour Products (id < 112 on WingsGo)
UPDATE tour_products
SET _status = 'draft',
    updated_at = NOW()
WHERE site_id = 2
  AND id < 112
  AND _status = 'published';

-- 2. Update latest version in _tour_products_v to draft
UPDATE _tour_products_v
SET version__status = 'draft',
    updated_at = NOW()
WHERE parent_id IN (
    SELECT id FROM tour_products WHERE site_id = 2 AND id < 112
)
  AND latest = true;

-- 3. Unpublish corresponding wrapper pages in pages table
UPDATE pages
SET _status = 'draft',
    updated_at = NOW()
WHERE site_id = 2
  AND id IN (
    SELECT wrapper_page_id
    FROM tour_products
    WHERE site_id = 2
      AND id < 112
      AND wrapper_page_id IS NOT NULL
  )
  AND _status = 'published';

-- 4. Update latest version in _pages_v to draft
UPDATE _pages_v
SET version__status = 'draft',
    updated_at = NOW()
WHERE parent_id IN (
    SELECT wrapper_page_id
    FROM tour_products
    WHERE site_id = 2
      AND id < 112
      AND wrapper_page_id IS NOT NULL
)
  AND latest = true;

-- 5. Unpublish corresponding departures
UPDATE tour_departures
SET _status = 'draft',
    updated_at = NOW()
WHERE site_id = 2
  AND tour_product_id IN (
    SELECT id FROM tour_products WHERE site_id = 2 AND id < 112
  )
  AND _status = 'published';

-- 6. Update latest version in _tour_departures_v to draft
UPDATE _tour_departures_v
SET version__status = 'draft',
    updated_at = NOW()
WHERE parent_id IN (
    SELECT id
    FROM tour_departures
    WHERE site_id = 2
      AND tour_product_id IN (
        SELECT id FROM tour_products WHERE site_id = 2 AND id < 112
      )
)
  AND latest = true;

COMMIT;
