SELECT 'university' AS table_name, count(*) AS row_count FROM university
UNION ALL
SELECT 'school', count(*) FROM school
UNION ALL
SELECT 'major', count(*) FROM major
UNION ALL
SELECT 'major_mapping', count(*) FROM major_mapping
UNION ALL
SELECT 'course', count(*) FROM course
UNION ALL
SELECT 'program', count(*) FROM program
UNION ALL
SELECT 'credit_requirement', count(*) FROM credit_requirement
ORDER BY table_name;

SELECT 'school.university_id' AS check_name, count(*) AS broken_rows
FROM school s LEFT JOIN university u ON u.id = s.university_id
WHERE u.id IS NULL
UNION ALL
SELECT 'major.school_id', count(*)
FROM major m LEFT JOIN school s ON s.id = m.school_id
WHERE s.id IS NULL
UNION ALL
SELECT 'course.school_id', count(*)
FROM course c LEFT JOIN school s ON s.id = c.school_id
WHERE s.id IS NULL
UNION ALL
SELECT 'program.major_id', count(*)
FROM program p LEFT JOIN major m ON m.id = p.major_id
WHERE m.id IS NULL
UNION ALL
SELECT 'program.course_id', count(*)
FROM program p LEFT JOIN course c ON c.id = p.course_id
WHERE c.id IS NULL;

SELECT * FROM v_major_normalized ORDER BY university_id, major_id;
