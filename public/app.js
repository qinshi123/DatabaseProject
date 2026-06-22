const form = document.querySelector("#query-form");
const input = document.querySelector("#question");
const examplesEl = document.querySelector("#examples");
const statusEl = document.querySelector("#status");
const sqlOutput = document.querySelector("#sql-output");
const tableOutput = document.querySelector("#table-output");
const rowCount = document.querySelector("#row-count");
const templateName = document.querySelector("#template-name");
const exportCsv = document.querySelector("#export-csv");
const statStrip = document.querySelector("#stat-strip");

let latestColumns = [];
let latestRows = [];

function setStatus(text, isError = false) {
  statusEl.textContent = text;
  statusEl.classList.toggle("error", isError);
}

function renderTable(columns, rows) {
  latestColumns = columns;
  latestRows = rows;
  rowCount.textContent = `${rows.length} 行`;
  exportCsv.disabled = rows.length === 0;

  if (!rows.length) {
    tableOutput.className = "table-output empty";
    tableOutput.textContent = "查询成功，但没有返回数据";
    return;
  }

  tableOutput.className = "table-output";
  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  for (const column of columns) {
    const th = document.createElement("th");
    th.textContent = column;
    headerRow.appendChild(th);
  }

  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  for (const row of rows) {
    const tr = document.createElement("tr");
    for (const column of columns) {
      const td = document.createElement("td");
      const value = row[column];
      td.textContent = value === null || value === undefined ? "" : value;
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  tableOutput.replaceChildren(table);
}

function renderMessage(message) {
  latestColumns = [];
  latestRows = [];
  rowCount.textContent = "0 行";
  exportCsv.disabled = true;
  tableOutput.className = "table-output empty";
  tableOutput.innerHTML = "";
  const div = document.createElement("div");
  div.className = "message";
  div.textContent = message;
  tableOutput.appendChild(div);
}

async function runQuery(question) {
  setStatus("查询中...");
  sqlOutput.textContent = "生成 SQL 中...";
  templateName.textContent = "-";
  renderMessage("等待数据库返回结果");

  const response = await fetch("/api/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question })
  });

  const payload = await response.json();
  if (!response.ok) {
    setStatus("查询失败", true);
    sqlOutput.textContent = payload.sql || "没有生成 SQL";
    renderMessage(payload.error || payload.detail || "查询失败");
    return;
  }

  setStatus("查询完成");
  templateName.textContent = payload.templateName;
  sqlOutput.textContent = payload.sql;
  renderTable(payload.columns, payload.rows);
}

async function loadExamples() {
  const response = await fetch("/api/examples");
  const payload = await response.json();
  examplesEl.replaceChildren();

  for (const example of payload.examples) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = example;
    button.addEventListener("click", () => {
      input.value = example;
      runQuery(example);
    });
    examplesEl.appendChild(button);
  }
}

async function loadStats() {
  const response = await fetch("/api/stats");
  if (!response.ok) return;
  const payload = await response.json();
  const byLabel = Object.fromEntries(payload.counts.map((item) => [item.label, item.value]));
  statStrip.innerHTML = `
    <div><strong>${byLabel["学校"] ?? "-"}</strong><span>学校</span></div>
    <div><strong>${byLabel["课程"] ?? "-"}</strong><span>课程</span></div>
    <div><strong>${byLabel["培养方案记录"] ?? "-"}</strong><span>方案记录</span></div>
  `;
}

function downloadCsv() {
  if (!latestRows.length) return;
  const escapeCell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const csv = [
    latestColumns.map(escapeCell).join(","),
    ...latestRows.map((row) => latestColumns.map((column) => escapeCell(row[column])).join(","))
  ].join("\r\n");
  const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "query-result.csv";
  link.click();
  URL.revokeObjectURL(url);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const question = input.value.trim();
  if (!question) {
    setStatus("请输入问题", true);
    return;
  }
  runQuery(question);
});

exportCsv.addEventListener("click", downloadCsv);
exportCsv.disabled = true;

loadExamples().catch(() => {
  examplesEl.textContent = "示例问题加载失败";
});

loadStats().catch(() => {});

runQuery(input.value).catch((error) => {
  setStatus("连接失败", true);
  sqlOutput.textContent = "请确认服务端和 PostgreSQL 已启动。";
  renderMessage(error.message);
});
