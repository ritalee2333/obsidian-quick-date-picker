## What's New in 1.2.1

### Improved
- Settings adopt Obsidian 1.13 declarative `getSettingDefinitions()` (still works on older versions via `display()`)
- Prefer Obsidian DOM helpers (`createDiv` / `createSpan`) over `document.createElement`
- Tighten TypeScript typing around date formatting and editor suggest
- Automated GitHub Releases with artifact attestations for `main.js`, `manifest.json`, and `styles.css`

---

## 1.2.1 更新内容

### 优化
- 设置页支持 Obsidian 1.13 声明式 `getSettingDefinitions()`（旧版本仍走 `display()`）
- DOM 创建改用 Obsidian 的 `createDiv` / `createSpan`
- 加强日期格式化与编辑器建议相关的 TypeScript 类型
- 用 GitHub Actions 自动发版，并为发布资源生成 artifact attestation
