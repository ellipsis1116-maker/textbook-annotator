# 课本 PDF 标注系统（纯静态单文件版）

本项目采用 **零打包前端** 架构：

- 前端主逻辑仅 `public/index.html`
- 通过 CDN 引入 Vue 3 / TailwindCSS / PDF.js
- 标注主缓存保存在 `localStorage`
- CSV 工作流采用**按单元自动加载/保存**

## 当前数据与标注流程

- PDF：`public/unit1.pdf` ~ `public/unit8.pdf`
- 单元 CSV（推荐命名）：`public/wordlist/unitN.csv`
- 兼容旧命名：`public/wordlist/unitN-annotations.csv`
- 自动加载顺序：先尝试 `unitN.csv`，找不到再尝试 `unitN-annotations.csv`
- `pageNum` 统一为**课本真实页码**（非单元内相对页码）

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
