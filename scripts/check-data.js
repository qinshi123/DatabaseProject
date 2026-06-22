const fs = require("fs");
const path = require("path");

const expectedRows = {
  "university.csv": 2,
  "school.csv": 28,
  "major.csv": 5,
  "course.csv": 206,
  "credit_requirement.csv": 4,
  "program.csv": 397
};

const dataDir = path.join(__dirname, "..", "data");
let failed = false;

for (const [fileName, expected] of Object.entries(expectedRows)) {
  const filePath = path.join(dataDir, fileName);
  const rows = fs.readFileSync(filePath, "utf8").trim().split(/\r?\n/).length;
  if (rows !== expected) {
    console.error(`${fileName}: expected ${expected}, got ${rows}`);
    failed = true;
  } else {
    console.log(`${fileName}: ${rows}`);
  }
}

if (failed) {
  process.exit(1);
}

