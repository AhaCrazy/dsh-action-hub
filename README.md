# dsh-action-hub · Action 收藏夹

> 把常用的提示词和流程存成 **Action**：不占上下文、不会被 Agent 自动触发，需要时从输入框下方一键取用。

[English](README.en.md) | 中文

---

## 为什么做这个插件

把常用提示词封装成 Skill 有两个绕不开的问题：

1. **Skill 会常驻上下文**：目录里每个 Skill 的名称与描述都会进入系统提示，收藏越多，平时聊天要付的 token 就越多。
2. **Skill 是被动触发**：Agent 会自己判断要不要调用。像「git-svn 推送」这类流程，你希望**只在自己需要时**执行，甚至希望 Agent 不要去碰它。

Action 收藏夹把这两件事拆开：

- **不注入上下文**：插件不注册任何 Agent Tool，也不往 system prompt 里加一个字。Action 只存在于本地收藏夹里。
- **只由用户触发**：管理页负责增删改查与搜索；使用时在输入框下方点一下，正文插入输入框，由你按 Enter 发送。
- **可整理、可分享**：分类、标签、搜索、参数占位符、从现有 Skill 一键导入、整库导出/导入。

## 功能

| 功能 | 说明 |
| --- | --- |
| 侧边栏管理页 | 新建 / 编辑 / 复制 / 删除、按分类筛选、全文搜索（名称、描述、分类、标签、正文） |
| 输入框快捷入口 | 会话输入框下方的 `Actions · N`，弹层内搜索、分类筛选、参数输入、点击即插入 |
| 参数占位符 | 正文中的 `{{args}}` / `$ARGUMENTS` 在插入时替换成弹层里填的参数；`{{date}}` 替换为当天日期 |
| 插入不覆盖草稿 | 已有草稿会保留，Action 正文追加在后面，再按 Enter 发送 |
| Skill 导入 | 「导入 → 从 Skill 导入」按项目目录列出本机 Skill，一键转成 Action（正文即 SKILL.md） |
| 分享 | 「导出」得到整库 JSON；对方「导入」即可合并或替换 |
| 斜杠命令 | `/action <名称> [参数]` 直接运行一条 Action（不填参数则列出全部可用 Action） |
| 首次内置 | 首次运行写入 3 条示例 Action（代码审查 / 提交信息 / 会话小结），可在 `cordis.patch.yml` 里用 `seed: false` 关闭 |

## 安装

本插件是一个 **DSH bundle**（Host 半 + Web Client 半，无构建步骤、无运行时依赖）。

### 方式一：通过 DSH Agent 安装（推荐）

在 DSH 中让 Agent 调用插件管理器安装这个目录：

```text
plugin_manager({ action: "install_bundle", target: "C:\\path\\to\\dsh-action-hub" })
```

安装结果出现 `application: "applied"` 后，侧边栏会多出 `Actions` 图标。若页面没有立即出现，刷新 DSH Web 页面。

### 方式二：手动接入 Profile

把包目录放进个人插件目录（例如 `~/Documents/dsh-plugins/dsh-action-hub`），然后在 profile 里加入依赖与 bundle 行。手工改 profile 属于进阶操作，推荐优先用方式一。

## 使用

### 管理页

- 侧边栏点击 `Actions`。
- 「新建 Action」：名称、分类、标签、描述、参数提示、提示词正文。
- 卡片上可以复制正文、编辑、复制一份、删除；顶部可导入/导出、手动刷新。
- 分类是自由文本，筛选栏会自动汇总；「管理分类」支持重命名与删除（删除分类不会删除 Action，只会移到未分类）。

### 在会话里调用

会话输入框下方会出现 `Actions · N`：

1. 点击打开弹层，必要时先填「参数」。
2. 点击某条 Action，正文会**追加**到当前输入框，底部提示「已插入输入框，按 Enter 发送」。
3. 你确认、修改后按 Enter 发送。

这样 Action 只在真正被使用时才进入上下文，而且一定经过你这一下确认。

### 斜杠命令

```text
/action                 # 列出可用 Action
/action 代码审查         # 运行「代码审查」
/action 代码审查 重点看网络层
```

命令把正文作为一条**真实用户消息**提交给当前会话（与在输入框里发送等价），因此会留下正常对话记录。

### 从 Skill 导入

「导入 → 从 Skill 导入」：

- 项目目录留空时扫描 Profile 的默认工作目录；项目级 Skill（`.agents/skills`、`.dsh/skills`）需要填写项目根目录。
- 列表显示当前可发现的 Skill，点「导入为 Action」即可把 SKILL.md 正文存为 Action，分类为「导入」，标签带 `skill`。

## 数据与隐私

- 数据保存在 `$DSH_HOME/action-hub/actions.json`（默认 `~/.dsh/action-hub/actions.json`），与 DSH Profile 同机。
- 写入是「临时文件 + 原子重命名」，不会因崩溃写坏整库。
- 导出文件包含正文与分类标签，不含使用次数等本机统计；分享前请自行检查正文是否含内部信息。
- 插件不发出任何网络请求（除了浏览器到本机 DSH Host 的 `/api/dsh-action-hub` 同源请求）。

## 设计说明

- **Host 半**（`index.js` + `store.js`）：维护 JSON 收藏库，注册同源 HTTP 路由 `/api/dsh-action-hub`（`state` / `create` / `update` / `delete` / `duplicate` / `touch` / `import` / `export` / `skills` / `import-skill` / `category/*`），并在 `commands` 服务可用时注册 `/action` 命令。命令通过 `sessionController.prompt(... mode: 'queue')` 提交一条 `source.kind = 'user'` 的消息。
- **Client 半**（`client.js`）：注册 `main` 管理页、`sidebar.panellist` 图标、`conversation.composer.dock` 快捷入口；插入动作使用宿主提供的 `inputActions.setDraft()`，因此不需要猜测编辑器实现。
- **明确不做的事**：不注册 `ctx.tools`，不调用 `ctx.systemPrompt.section()`，不监听 `agent/pre-step`。收藏夹再大也不会增加每轮请求的 token。

## 兼容性

- 面向 DSH 桌面版 / Web UI（0.2.x，插件 API 仍在预览期）。
- 管理页与快捷入口需要 Host 的 `webServer` 服务；斜杠命令额外需要 `commands` 与 `sessionController` 服务，缺失时会安全降级（不注册命令 / 命令返回错误文本）。
- 更新插件文件后，浏览器端需要刷新页面（或由 HMR）重新加载 `client.js`；Host 端改动需要重新加载 bundle。

## 开发

```powershell
# 语法与测试（Node >= 22，无需安装依赖）
node --check index.js
node --check client.js
node --check store.js
npm test
```

- `tests/store.test.mjs`：数据模型、占位符、导入合并、原子持久化。
- `tests/client.test.mjs`：捕获 `window.__ModuleLoader__` 注册、纯函数、语言字典完整性，并断言「不注册 tool / prompt」。
- `tests/host.test.mjs`：同源校验、导出裁剪、`/action` 参数解析。

目录：

```text
dsh-action-hub/
├── package.json          # bundle 清单 + dsh.bundle / dsh.client
├── cordis.patch.yml      # Loader 行（可配置 seed / dataDir）
├── index.js              # Host 半：路由 + /action 命令
├── store.js              # 收藏库、数据模型、导入合并
├── client.js             # Web 半：管理页 + 快捷入口 + 图标
├── locale/{zh,en}.json   # 插件管理器展示名
├── icon.svg
└── tests/
```

## License

MIT © 2026 AhaCrazy
