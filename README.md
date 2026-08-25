# 课本 PDF 标注系统（纯静态单文件版）

本项目采用 **零打包前端** 架构：

- 前端主逻辑仅 `public/index.html`
- Cloudflare Pages Functions 位于项目根目录 `functions/`，与静态输出目录 `public/` 同级
- 通过 CDN 引入 Vue 3 / TailwindCSS / PDF.js
- 标注主缓存保存在 `localStorage`
- CSV 工作流采用**按单元自动加载/保存**

## 当前数据与标注流程

- PDF：`public/pdfs/unit1.pdf` ~ `public/pdfs/unit8.pdf`
- 标注数据存储在 Cloudflare KV。
- 本地 `localStorage` 作为兜底缓存。
- 自动加载顺序：优先尝试从 KV 加载，失败则尝试从 `/wordlist/unitN-annotations.csv` 等静态文件加载（仅限 `index.html`）。
- 云端 CSV 导出仅包含 `类型, 序号, 英文, 中文` 四列；坐标等内部字段只保留在 KV JSON 中。
- 当前仓库的历史兜底文件位于 `public/wordlist/`，例如 `unit1-annotations.csv`。
- `pageNum` 统一为**课本真实页码**（非单元内相对页码）

## Cloudflare KV 云端持久化（新增）

- 前端会优先通过 Pages Functions 读取/写入 KV：`/api/annotations?unit=N`
- 导出接口：
  - `GET /api/export-csv?unit=N`：从 KV 读取 JSON 标注并实时转换为 CSV 下载。
- 本地 `localStorage` 保留为兜底缓存（用于离线或云端不可达时临时编辑）。
- `/dashboard.html` 提供公开的单元选择、刷新统计和 CSV 下载入口。

### 1) 绑定 KV Namespace

请在 Cloudflare Dashboard 中完成绑定，不要在本地配置文件中填写 Namespace ID：

1. 打开 **Workers & Pages**，选择对应的 Pages 项目。
2. 进入 **Settings** → **Functions** → **KV namespace bindings**。
3. 添加 KV Namespace，变量名填写 `ANNOTATION_KV`，选择生产环境的 Namespace。
4. 如需预览部署，再切换到 Preview 环境并绑定对应的 KV Namespace。
5. 保存后重新部署项目，使 Pages Functions 使用新的绑定。

## 本地运行

```bash
cd public
python -m http.server 8788
```

浏览器访问：`http://localhost:8788/index.html`

> 不建议直接双击打开 `index.html`（`file://` 模式），PDF.js 在 file 协议下可能加载失败。

---

## Git + Cloudflare Pages 部署（推荐）

### 1) 初始化 Git 仓库并推送到 GitHub

```bash
cd textbook-annotator
git init
git add .
git commit -m "chore: init textbook annotator"
git branch -M main
git remote add origin <你的仓库地址>
git push -u origin main
```

### 2) 在 Cloudflare Pages 绑定仓库

1. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages**
2. 选择 **Connect to Git**，绑定 GitHub 仓库
3. 构建配置：
   - Framework preset: `None`
   - Build command: 留空
   - Build output directory: `public`
  - 不要将 `functions/` 填入输出目录或移动到 `public/` 内
4. 点击 Deploy

后续每次 push 到 `main` 会自动重新部署。

### 3) CLI 方式（可选）

```bash
npm install
npx wrangler login
npx wrangler pages deploy public --project-name <你的 pages 项目名>
```

---

## 中国大陆访问说明（重要）

- Cloudflare Pages **可以部署**，但在中国大陆的访问质量**不保证稳定**（受地区/运营商/时段影响）。
- 如果目标用户主要在大陆，建议增加一个国内可用的正式部署（国内云 + 备案域名）。
- 可采用“双站”策略：Cloudflare 作为国际/开发站，国内站作为稳定访问入口。
