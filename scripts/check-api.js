const baseUrl = process.env.APP_URL || "http://127.0.0.1:3000";

const questions = [
  "比较两校金融学总学分要求",
  "金融学在两所学校的课程设置有什么不同",
  "两校金融学有哪些共同课程",
  "上海财经大学金融学必修课有哪些",
  "西南财经大学金融学按课程类别统计学分",
  "比较两校金融学实践学分要求"
];

async function checkQuestion(question) {
  const response = await fetch(`${baseUrl}/api/query`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ question })
  });
  const payload = await response.json();

  if (!response.ok || !Array.isArray(payload.rows) || payload.rows.length === 0) {
    throw new Error(`${question}: ${payload.error || response.statusText}`);
  }

  console.log(`${question} => ${payload.templateName}, rows=${payload.rows.length}`);
}

(async () => {
  for (const question of questions) {
    await checkQuestion(question);
  }
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

