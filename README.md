# 跨校培养方案对比分析

这是一个数据库课程项目：将西南财经大学与上海财经大学的培养方案 CSV 数据导入 PostgreSQL，并提供一个中文自然语言查询 Web Demo。系统会把问题匹配到预设 SQL 模板，展示生成的 SQL 和查询结果。

## 功能

- PostgreSQL 存储 6 类数据：学校、学院、专业、课程、培养方案、学分要求。
- 支持跨校对比：课程差异、共同课程、总学分、必修/选修/实践学分。
- 支持中文问题查询，并在页面展示生成的 SQL。
- 使用 `major_mapping` 表维护跨校专业归一化，例如将“金融学（证券及期货方向）”归并为“金融学”。
- 支持 Docker 一键启动，也支持连接本机 PostgreSQL。

## 快速运行：Docker 推荐

需要先安装 Docker Desktop。

```powershell
docker compose up --build
```

启动后打开：

```text
http://localhost:3000
```

Docker 会自动创建 PostgreSQL 数据库、建表、导入 `data/` 目录中的 CSV，并启动 Web 服务。

如果你修改了数据库初始化脚本或 CSV，想重新初始化数据库：

```powershell
docker compose down -v
docker compose up --build
```

## 本机 PostgreSQL 运行

需要安装：

- Node.js 18+
- PostgreSQL 18，默认监听 `localhost:5432`

安装依赖：

```powershell
npm.cmd install
```

如果 Windows 环境提示 npm 缓存目录没有权限，可以改用项目内缓存：

```powershell
npm.cmd install --cache .\.npm-cache
```

复制环境变量：

```powershell
Copy-Item .env.example .env
```

编辑 `.env`，填写本机 PostgreSQL 密码。

创建数据库并导入数据：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\import.ps1 -CreateDatabase
```

启动 Web 服务：

```powershell
npm.cmd start
```

也可以直接双击项目根目录下的 `start-local.bat`，它会启动服务并打开浏览器。

打开：

```text
http://localhost:3000
```

## 示例问题

- 比较两校金融学总学分要求
- 金融学在两所学校的课程设置有什么不同
- 两校金融学有哪些共同课程
- 上海财经大学金融学必修课有哪些
- 西南财经大学金融学按课程类别统计学分
- 比较两校金融学实践学分要求
- 上海财经大学金融学按学期排列培养方案

## 项目结构

```text
.
├── data/                  # UTF-8 CSV 数据
├── db/
│   ├── schema.sql         # 建表、索引、视图
│   ├── seed_mapping.sql   # 专业归一化映射
│   ├── verify.sql         # 行数和外键校验
│   └── example_queries.sql
├── public/                # 前端页面
├── scripts/               # 导入和检查脚本
├── src/server.js          # Express API 服务
├── docker-compose.yml
└── Dockerfile
```

## 数据库设计

核心表：

- `university(id, name)`
- `school(id, name, university_id)`
- `major(id, name, school_id, degree_level, duration_years)`
- `major_mapping(major_id, normalized_major_name, mapping_note)`
- `course(id, name, credit, hours, school_id)`
- `program(id, major_id, course_id, semester, category, is_required)`
- `credit_requirement(id, major_id, total_credits, required_credits, elective_credits, practice_credits, year)`

核心视图：

- `v_major_normalized`：联结学校、学院、专业，并输出归一化专业名。
- `v_program_detail`：联结培养方案、课程、专业、学院、学校，供查询模板直接使用。

## 自然语言查询实现

本项目没有接入大模型，而是采用规则模板：

1. 从中文问题中识别学校，例如“上财”“上海财经大学”“西财”“西南财经大学”。
2. 从中文问题中识别专业，例如“金融学”“保险学”“投资学”“信用管理”。
3. 根据关键词匹配查询意图，例如“总学分”“共同课程”“不同”“必修课”“课程类别”。
4. 选择对应 SQL 模板，使用参数化查询访问 PostgreSQL。
5. 页面展示 SQL 和结果表格。


## 检查

静态检查和数据行数检查：

```powershell
npm.cmd run check
```

启动服务后检查 API 示例问题：

```powershell
npm.cmd run test:api
```

## 注意

- `.env` 中可能包含数据库密码，已经被 `.gitignore` 忽略，不要提交。
- `data/` 中的 CSV 是 UTF-8 编码，无表头。
- `university.id=1` 表示西南财经大学，`university.id=2` 表示上海财经大学。
