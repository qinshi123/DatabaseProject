\encoding UTF8
\copy university(id, name) FROM '/docker-entrypoint-initdb.d/data/university.csv' WITH (FORMAT csv, ENCODING 'UTF8')
\copy school(id, name, university_id) FROM '/docker-entrypoint-initdb.d/data/school.csv' WITH (FORMAT csv, ENCODING 'UTF8')
\copy major(id, name, school_id, degree_level, duration_years) FROM '/docker-entrypoint-initdb.d/data/major.csv' WITH (FORMAT csv, ENCODING 'UTF8')
\copy course(id, name, credit, hours, school_id) FROM '/docker-entrypoint-initdb.d/data/course.csv' WITH (FORMAT csv, ENCODING 'UTF8')
\copy credit_requirement(id, major_id, total_credits, required_credits, elective_credits, practice_credits, year) FROM '/docker-entrypoint-initdb.d/data/credit_requirement.csv' WITH (FORMAT csv, ENCODING 'UTF8')
\copy program(id, major_id, course_id, semester, category, is_required) FROM '/docker-entrypoint-initdb.d/data/program.csv' WITH (FORMAT csv, ENCODING 'UTF8')
