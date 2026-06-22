INSERT INTO major_mapping (major_id, normalized_major_name, mapping_note)
SELECT
  id,
  CASE
    WHEN name LIKE '金融学%' THEN '金融学'
    ELSE name
  END AS normalized_major_name,
  CASE
    WHEN name LIKE '金融学%' AND name <> '金融学'
      THEN '将专业方向归并到金融学，用于跨校同专业对比'
    ELSE '与原专业名称一致'
  END AS mapping_note
FROM major
ON CONFLICT (major_id) DO UPDATE SET
  normalized_major_name = EXCLUDED.normalized_major_name,
  mapping_note = EXCLUDED.mapping_note;
