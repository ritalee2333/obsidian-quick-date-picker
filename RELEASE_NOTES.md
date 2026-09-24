## What's New in 1.2.4

### Changed
- Require Obsidian **1.13.0+**
- Settings use the declarative `getSettingDefinitions()` API (settings appear in Obsidian’s settings search)

### Improved
- Prefer Obsidian DOM helpers (`createDiv` / `createSpan`) for marketplace review compliance
- Stronger TypeScript typing around date formatting and the editor suggest flow
- GitHub Releases are built in CI with artifact attestations for `main.js`, `manifest.json`, and `styles.css`

### Fixed
- Settings: default format and favorite format editors render correctly (no empty panels / crushed layout)
- Settings: “Add favorite format” button works again

---

## 1.2.4 更新内容

### 变更
- 最低要求 Obsidian **1.13.0+**
- 设置页改用声明式 `getSettingDefinitions()`（可被 Obsidian 设置搜索收录）

### 优化
- DOM 创建改用 Obsidian 的 `createDiv` / `createSpan`，满足应用市场审核建议
- 加强日期格式化与编辑器建议相关的 TypeScript 类型
- 公开发版由 CI 构建，并为 `main.js` / `manifest.json` / `styles.css` 生成 artifact attestation

### 修复
- 设置页：默认格式 / 常用格式编辑区可正常显示（不再空白或挤成一行）
- 设置页：「添加常用格式」按钮可再次点击生效
