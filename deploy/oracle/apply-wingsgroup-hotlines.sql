BEGIN;

DO $$
DECLARE
  target_parent_id integer;
BEGIN
  SELECT ss.id INTO target_parent_id
  FROM site_settings ss
  JOIN sites s ON ss.site_id = s.id
  WHERE s.code = 'wings-group';

  IF target_parent_id IS NULL THEN
    RAISE EXCEPTION 'SiteSettings for wings-group not found';
  END IF;

  INSERT INTO site_settings_additional_hotlines (_order, _parent_id, id, phone_number, label)
  VALUES (1, target_parent_id, 'wingsgroup-' || target_parent_id || '-hotline-2', '0915250101', 'Tư vấn tour')
  ON CONFLICT (id) DO UPDATE SET
    _order = EXCLUDED._order,
    _parent_id = EXCLUDED._parent_id,
    phone_number = EXCLUDED.phone_number,
    label = EXCLUDED.label;

  INSERT INTO site_settings_additional_hotlines (_order, _parent_id, id, phone_number, label)
  VALUES (2, target_parent_id, 'wingsgroup-' || target_parent_id || '-hotline-3', '0915260101', 'Hỗ trợ dịch vụ')
  ON CONFLICT (id) DO UPDATE SET
    _order = EXCLUDED._order,
    _parent_id = EXCLUDED._parent_id,
    phone_number = EXCLUDED.phone_number,
    label = EXCLUDED.label;
END $$;

COMMIT;
