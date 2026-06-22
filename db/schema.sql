BEGIN;

DROP VIEW IF EXISTS v_program_detail;
DROP VIEW IF EXISTS v_major_normalized;
DROP TABLE IF EXISTS program;
DROP TABLE IF EXISTS credit_requirement;
DROP TABLE IF EXISTS course;
DROP TABLE IF EXISTS major_mapping;
DROP TABLE IF EXISTS major;
DROP TABLE IF EXISTS school;
DROP TABLE IF EXISTS university;

CREATE TABLE university (
  id integer PRIMARY KEY,
  name text NOT NULL UNIQUE
);

CREATE TABLE school (
  id integer PRIMARY KEY,
  name text NOT NULL,
  university_id integer NOT NULL REFERENCES university(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE major (
  id integer PRIMARY KEY,
  name text NOT NULL,
  school_id integer NOT NULL REFERENCES school(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  degree_level text NOT NULL,
  duration_years integer NOT NULL CHECK (duration_years > 0)
);

CREATE TABLE major_mapping (
  major_id integer PRIMARY KEY REFERENCES major(id) ON UPDATE CASCADE ON DELETE CASCADE,
  normalized_major_name text NOT NULL,
  mapping_note text
);

CREATE TABLE course (
  id integer PRIMARY KEY,
  name text NOT NULL,
  credit numeric(4,1) NOT NULL CHECK (credit >= 0),
  hours integer NOT NULL CHECK (hours >= 0),
  school_id integer NOT NULL REFERENCES school(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE program (
  id integer PRIMARY KEY,
  major_id integer NOT NULL REFERENCES major(id) ON UPDATE CASCADE ON DELETE CASCADE,
  course_id integer NOT NULL REFERENCES course(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  semester integer NOT NULL CHECK (semester > 0),
  category text NOT NULL,
  is_required boolean NOT NULL,
  UNIQUE (major_id, course_id)
);

CREATE TABLE credit_requirement (
  id integer PRIMARY KEY,
  major_id integer NOT NULL REFERENCES major(id) ON UPDATE CASCADE ON DELETE CASCADE,
  total_credits numeric(5,1) NOT NULL CHECK (total_credits >= 0),
  required_credits numeric(5,1) NOT NULL CHECK (required_credits >= 0),
  elective_credits numeric(5,1) NOT NULL CHECK (elective_credits >= 0),
  practice_credits numeric(5,1) NOT NULL CHECK (practice_credits >= 0),
  year integer NOT NULL,
  UNIQUE (major_id, year)
);

CREATE INDEX idx_school_university ON school(university_id);
CREATE INDEX idx_major_school ON major(school_id);
CREATE INDEX idx_major_mapping_normalized ON major_mapping(normalized_major_name);
CREATE INDEX idx_course_school ON course(school_id);
CREATE INDEX idx_program_major ON program(major_id);
CREATE INDEX idx_program_course ON program(course_id);
CREATE INDEX idx_program_category ON program(category);
CREATE INDEX idx_program_required ON program(is_required);
CREATE INDEX idx_credit_requirement_major ON credit_requirement(major_id);

CREATE VIEW v_major_normalized AS
SELECT
  m.id AS major_id,
  m.name AS major_name,
  COALESCE(mm.normalized_major_name, m.name) AS normalized_major_name,
  mm.mapping_note,
  m.degree_level,
  m.duration_years,
  s.id AS school_id,
  s.name AS school_name,
  u.id AS university_id,
  u.name AS university_name
FROM major m
LEFT JOIN major_mapping mm ON mm.major_id = m.id
JOIN school s ON s.id = m.school_id
JOIN university u ON u.id = s.university_id;

CREATE VIEW v_program_detail AS
SELECT
  p.id AS program_id,
  vmn.university_id,
  vmn.university_name,
  vmn.school_id,
  vmn.school_name,
  vmn.major_id,
  vmn.major_name,
  vmn.normalized_major_name,
  c.id AS course_id,
  c.name AS course_name,
  c.credit,
  c.hours,
  p.semester,
  p.category,
  p.is_required
FROM program p
JOIN v_major_normalized vmn ON vmn.major_id = p.major_id
JOIN course c ON c.id = p.course_id;

COMMIT;
