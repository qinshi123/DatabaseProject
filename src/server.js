require("dotenv").config();

const express = require("express");
const path = require("path");
const { Pool } = require("pg");

const app = express();
const port = Number(process.env.PORT || 3000);

const pool = new Pool({
  host: process.env.PGHOST || "localhost",
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE || "curriculum_compare",
  user: process.env.PGUSER || "postgres",
  password: process.env.PGPASSWORD || undefined
});

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

const EXAMPLES = [
  "比较两校金融学总学分要求",
  "金融学在两所学校的课程设置有什么不同",
  "两校金融学有哪些共同课程",
  "上海财经大学金融学必修课有哪些",
  "西南财经大学金融学按课程类别统计学分",
  "比较两校金融学实践学分要求",
  "上海财经大学金融学按学期排列培养方案"
];

function normalizeQuestion(question) {
  return String(question || "").replace(/\s+/g, "");
}

function extractMajor(question) {
  const knownMajors = ["金融学", "保险学", "投资学", "信用管理"];
  return knownMajors.find((major) => question.includes(major)) || "金融学";
}

function extractUniversity(question) {
  if (question.includes("上海财经大学") || question.includes("上财") || question.includes("上海")) {
    return "上海财经大学";
  }
  if (question.includes("西南财经大学") || question.includes("西财") || question.includes("西南")) {
    return "西南财经大学";
  }
  return null;
}

function renderSql(text, params) {
  return text.replace(/\$(\d+)/g, (_, index) => {
    const value = params[Number(index) - 1];
    if (value === null || value === undefined) return "NULL";
    if (typeof value === "number") return String(value);
    return `'${String(value).replace(/'/g, "''")}'`;
  });
}

function buildQuery(rawQuestion) {
  const question = normalizeQuestion(rawQuestion);
  const major = extractMajor(question);
  const university = extractUniversity(question);

  if (question.includes("共同课程") || question.includes("相同课程")) {
    return {
      templateName: "两校同一专业共同课程",
      params: [major],
      text: `
        SELECT
          course_name AS "共同课程",
          min(credit) AS "学分",
          string_agg(DISTINCT category, ' / ' ORDER BY category) AS "课程类别"
        FROM v_program_detail
        WHERE normalized_major_name = $1
        GROUP BY course_name
        HAVING count(DISTINCT university_name) = 2
        ORDER BY "学分" DESC, "共同课程";
      `
    };
  }

  if (question.includes("不同") || question.includes("差异") || question.includes("区别")) {
    return {
      templateName: "两校同一专业课程设置差异",
      params: [major],
      text: `
        WITH course_presence AS (
          SELECT
            normalized_major_name,
            course_name,
            max(credit) AS credit,
            string_agg(DISTINCT university_name, '、' ORDER BY university_name) AS universities,
            count(DISTINCT university_name) AS university_count
          FROM v_program_detail
          WHERE normalized_major_name = $1
          GROUP BY normalized_major_name, course_name
        )
        SELECT
          course_name AS "课程",
          credit AS "学分",
          universities AS "开设学校",
          CASE
            WHEN universities = '上海财经大学' THEN '仅上海财经大学'
            WHEN universities = '西南财经大学' THEN '仅西南财经大学'
            ELSE '两校均开设'
          END AS "差异类型"
        FROM course_presence
        WHERE university_count = 1
        ORDER BY "差异类型", "课程";
      `
    };
  }

  if (question.includes("类别") || question.includes("分类") || question.includes("汇总") || question.includes("统计")) {
    return {
      templateName: "某校某专业按课程类别汇总学分",
      params: [major, university],
      text: `
        SELECT
          university_name AS "学校",
          major_name AS "专业",
          category AS "课程类别",
          count(*) AS "课程数",
          sum(credit) AS "总学分",
          sum(CASE WHEN is_required THEN credit ELSE 0 END) AS "必修学分"
        FROM v_program_detail
        WHERE normalized_major_name = $1
          AND ($2::text IS NULL OR university_name = $2)
        GROUP BY university_name, major_name, category
        ORDER BY university_name, "总学分" DESC, category;
      `
    };
  }

  if (question.includes("学期") || question.includes("排列") || question.includes("培养方案")) {
    return {
      templateName: "某校某专业按学期排列培养方案",
      params: [major, university],
      text: `
        SELECT
          university_name AS "学校",
          major_name AS "专业",
          semester AS "学期",
          course_name AS "课程",
          credit AS "学分",
          hours AS "学时",
          category AS "课程类别",
          CASE WHEN is_required THEN '必修' ELSE '选修' END AS "修读要求"
        FROM v_program_detail
        WHERE normalized_major_name = $1
          AND ($2::text IS NULL OR university_name = $2)
        ORDER BY university_name, semester, is_required DESC, category, course_name;
      `
    };
  }

  if (question.includes("必修课") || (question.includes("必修") && question.includes("课程"))) {
    return {
      templateName: "某校某专业必修课程列表",
      params: [major, university],
      text: `
        SELECT
          university_name AS "学校",
          major_name AS "专业",
          semester AS "学期",
          course_name AS "必修课程",
          credit AS "学分",
          hours AS "学时",
          category AS "课程类别"
        FROM v_program_detail
        WHERE normalized_major_name = $1
          AND is_required = true
          AND ($2::text IS NULL OR university_name = $2)
        ORDER BY university_name, semester, category, course_name;
      `
    };
  }

  if (question.includes("实践")) {
    return {
      templateName: "两校同一专业实践学分要求",
      params: [major],
      text: `
        SELECT
          vmn.university_name AS "学校",
          vmn.major_name AS "专业",
          cr.practice_credits AS "实践学分要求",
          cr.total_credits AS "总学分要求",
          cr.year AS "年份"
        FROM credit_requirement cr
        JOIN v_major_normalized vmn ON vmn.major_id = cr.major_id
        WHERE vmn.normalized_major_name = $1
        ORDER BY vmn.university_id, vmn.major_id;
      `
    };
  }

  if (question.includes("选修")) {
    return {
      templateName: "两校同一专业选修学分要求",
      params: [major],
      text: `
        SELECT
          vmn.university_name AS "学校",
          vmn.major_name AS "专业",
          cr.elective_credits AS "选修学分要求",
          cr.total_credits AS "总学分要求",
          cr.year AS "年份"
        FROM credit_requirement cr
        JOIN v_major_normalized vmn ON vmn.major_id = cr.major_id
        WHERE vmn.normalized_major_name = $1
        ORDER BY vmn.university_id, vmn.major_id;
      `
    };
  }

  if (question.includes("必修")) {
    return {
      templateName: "两校同一专业必修学分要求",
      params: [major],
      text: `
        SELECT
          vmn.university_name AS "学校",
          vmn.major_name AS "专业",
          cr.required_credits AS "必修学分要求",
          cr.total_credits AS "总学分要求",
          cr.year AS "年份"
        FROM credit_requirement cr
        JOIN v_major_normalized vmn ON vmn.major_id = cr.major_id
        WHERE vmn.normalized_major_name = $1
        ORDER BY vmn.university_id, vmn.major_id;
      `
    };
  }

  if (question.includes("总学分") || question.includes("学分要求") || question.includes("学分")) {
    return {
      templateName: "两校同一专业总学分要求",
      params: [major],
      text: `
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
        WHERE vmn.normalized_major_name = $1
        ORDER BY vmn.university_id, vmn.major_id;
      `
    };
  }

  return null;
}

app.get("/api/examples", (_req, res) => {
  res.json({ examples: EXAMPLES });
});

app.get("/api/stats", async (_req, res) => {
  try {
    const [counts, majors] = await Promise.all([
      pool.query(`
        SELECT '学校' AS label, count(*)::int AS value FROM university
        UNION ALL
        SELECT '学院', count(*)::int FROM school
        UNION ALL
        SELECT '专业', count(*)::int FROM major
        UNION ALL
        SELECT '课程', count(*)::int FROM course
        UNION ALL
        SELECT '培养方案记录', count(*)::int FROM program
        ORDER BY label;
      `),
      pool.query(`
        SELECT
          normalized_major_name AS name,
          count(DISTINCT university_name)::int AS university_count
        FROM v_major_normalized
        GROUP BY normalized_major_name
        ORDER BY university_count DESC, name;
      `)
    ]);

    res.json({ counts: counts.rows, majors: majors.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/health", async (_req, res) => {
  try {
    const result = await pool.query("SELECT now() AS time");
    res.json({ ok: true, databaseTime: result.rows[0].time });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/query", async (req, res) => {
  const question = req.body?.question;
  const query = buildQuery(question);

  if (!query) {
    res.status(400).json({
      error: "暂时没有匹配到合适的查询模板，请换一个培养方案对比问题。",
      examples: EXAMPLES
    });
    return;
  }

  try {
    const result = await pool.query(query.text, query.params);
    res.json({
      question,
      templateName: query.templateName,
      sql: renderSql(query.text, query.params).trim(),
      columns: result.fields.map((field) => field.name),
      rows: result.rows
    });
  } catch (error) {
    res.status(500).json({
      error: "SQL 执行失败，请确认数据库已导入并且连接配置正确。",
      detail: error.message,
      sql: renderSql(query.text, query.params).trim()
    });
  }
});

process.on("SIGINT", async () => {
  await pool.end();
  process.exit(0);
});

app.listen(port, () => {
  console.log(`Curriculum compare app running at http://localhost:${port}`);
});
