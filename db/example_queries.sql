-- 1. 对比两校金融学总学分要求
-- 这里的“金融学”来自 major_mapping.normalized_major_name，
-- 已将“金融学（证券及期货方向）”归并到“金融学”。
SELECT
  vmn.university_name AS "学校",
  vmn.major_name AS "专业",
  cr.total_credits AS "总学分要求",
  cr.required_credits AS "必修学分",
  cr.elective_credits AS "选修学分",
  cr.practice_credits AS "实践学分",
  cr.year AS "年份"
FROM credit_requirement cr
JOIN v_major_normalized vmn ON vmn.major_id = cr.major_id
WHERE vmn.normalized_major_name = '金融学'
ORDER BY vmn.university_id, vmn.major_id;

-- 2. 对比两校金融学课程设置差异
WITH course_presence AS (
  SELECT
    course_name,
    max(credit) AS credit,
    string_agg(DISTINCT university_name, '、' ORDER BY university_name) AS universities,
    count(DISTINCT university_name) AS university_count
  FROM v_program_detail
  WHERE normalized_major_name = '金融学'
  GROUP BY course_name
)
SELECT
  course_name AS "课程",
  credit AS "学分",
  universities AS "开设学校"
FROM course_presence
WHERE university_count = 1
ORDER BY universities, course_name;

-- 3. 查询两校金融学共同课程
SELECT
  course_name AS "共同课程",
  min(credit) AS "学分",
  string_agg(DISTINCT category, ' / ' ORDER BY category) AS "课程类别"
FROM v_program_detail
WHERE normalized_major_name = '金融学'
GROUP BY course_name
HAVING count(DISTINCT university_name) = 2
ORDER BY "学分" DESC, "共同课程";

-- 4. 查询上海财经大学金融学必修课程
SELECT
  semester AS "学期",
  course_name AS "必修课程",
  credit AS "学分",
  hours AS "学时",
  category AS "课程类别"
FROM v_program_detail
WHERE normalized_major_name = '金融学'
  AND university_name = '上海财经大学'
  AND is_required = true
ORDER BY semester, category, course_name;

-- 5. 查询西南财经大学金融学按课程类别汇总的学分
SELECT
  category AS "课程类别",
  count(*) AS "课程数",
  sum(credit) AS "总学分",
  sum(CASE WHEN is_required THEN credit ELSE 0 END) AS "必修学分"
FROM v_program_detail
WHERE normalized_major_name = '金融学'
  AND university_name = '西南财经大学'
GROUP BY category
ORDER BY "总学分" DESC, category;

-- 6. 对比两校金融学实践学分要求
SELECT
  vmn.university_name AS "学校",
  vmn.major_name AS "专业",
  cr.practice_credits AS "实践学分要求",
  cr.total_credits AS "总学分要求",
  cr.year AS "年份"
FROM credit_requirement cr
JOIN v_major_normalized vmn ON vmn.major_id = cr.major_id
WHERE vmn.normalized_major_name = '金融学'
ORDER BY vmn.university_id, vmn.major_id;
