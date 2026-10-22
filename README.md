# Action Hub

**给 DSH 加一个 Spotlight 式的 Action 收藏夹：常用提示词与流程，搜一下就插进输入框，不占上下文、不会被 Agent 自动调用。**

[English](README.en.md) · [更新日志](CHANGELOG.md) · [DSH 插件](https://github.com/deepseek-ai/deepseek-harness)

[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![version](https://img.shields.io/badge/version-2.0.0-green.svg)](CHANGELOG.md)
[![dsh](https://img.shields.io/badge/dsh-0.2.x-4f46e5.svg)](package.json)

![Action Hub 命令面板](assets/screenshots/01-palette.png)

## 为什么需要它

把常用提示词写成 Skill，会同时遇到两个问题：

1. **常驻上下文**：每个 Skill 的名称与描述都会进入系统提示，收藏越多，日常对话要付的 token 就越多。
2. **被动触发**：Agent 会自己判断要不要调用。像「git-svn 推送」这类流程，你只想在自己需要时执行，甚至不希望 Agent 碰它。

Action Hub 把「收藏」和「调用」分开：

- **零上下文占用**：不注册 Agent Tool，不向 system prompt 写入任何内容。收藏夹再大，每轮请求都是 0 token。
- **只由你触发**：`⌘/Ctrl + Shift + .` 或输入框工具行的按钮打开面板；选中后以引用插入（对话里只显示 Action 名），按 Enter 才发送。
- **可整理、可分享**：分类、标签、置顶、全文搜索、从 Skill 一键导入、整库导出/导入。

## 界面

| 命令面板 | 管理库 |
| --- | --- |
| ![命令面板](assets/screenshots/01-palette.png) | ![管理库](assets/screenshots/02-library.png) |
| 搜索、分类、实时预览、参数输入，全键盘操作 | 左侧分类导航 + 搜索排序 + 紧凑列表 + 详情 |

| Action 详情 | 设置 |
| --- | --- |
| ![详情](assets/screenshots/03-detail.png) | ![设置](assets/screenshots/04-settings.png) |
| 完整正文、标签、使用次数、复制/编辑/删除 | 插入行为、快捷键、输入框按钮与数据位置 |

## 功能

| 能力 | 说明 |
| --- | --- |
| Spotlight 面板 | `⌘/Ctrl+Shift+.` 或输入框工具行按钮；搜索、分类 Tab、实时预览、参数输入 |
| 键盘优先 | `↑↓` 选择、`Enter` 插入、`Ctrl/⌘+Enter` 插入并发送、`Tab` 切换分类、`Esc` 关闭 |
| 引用式插入 | 无参数时插入 Action 引用 chip：**输入框和对话里都只显示 Action 名**，正文由插件在发送时注入给模型；不注册任何 Skill |
| 快捷键可改 | 默认 `Ctrl/⌘ + Shift + .`，登记在 设置 → 通用设置 → 快捷键，可自行重绑 |
| 光标处插入 | 使用宿主 `inputActions.insertText()`，作为一次可撤销编辑插入光标处，不覆盖已有草稿 |
| 存当前草稿 | 面板内一键把输入框里的内容存成 Action，补名称/分类/标签即可 |
| 置顶 | 星标常用 Action，面板与列表都排在最前 |
| 管理库 | 分类导航与计数、全文搜索（名称/描述/分类/标签/正文）、按最近使用/名称/创建时间排序 |
| 参数占位符 | `{{args}}` / `$ARGUMENTS` 由面板参数替换，`{{date}}` 替换为当天日期 |
| 资源文件 | 每条 Action 可附带代码、模板、说明等本地文件；调用时小文本内联，大文件给出本地路径按需读取 |
| 从 Skill 导入 | 浏览项目目录下的 Skill，把 `SKILL.md` 正文和同目录资源文件一起导入为 Action |
| 分享 | 整库导出 JSON（含资源文件内容），可合并或替换导入；使用次数等本机统计不会带出 |
| 快捷命令 | `/action <名称> [参数]` 直接运行；不带参数时列出全部 Action |

## 安装

Action Hub 是一个 DSH bundle（Host 半 + Web 半，无构建步骤、无运行时依赖）。

**从插件市场安装**（收录完成后）：DSH → 插件市场 → 搜索 `Action Hub` → 安装 → 启用。

**从 GitHub 源码安装**：

```sh
dsh plugin --profile desktop add "github:AhaCrazy/dsh-action-hub#main"
```

**从本地目录安装**（开发/未上架时）：
DSH → 插件 → 添加插件 → 填入本目录的绝对路径 → 安装 → 启用 → 刷新页面。

安装后侧边栏出现 `Actions` 图标，会话输入框工具行最左侧出现 Action Hub 按钮。

## 使用

### 打开面板

- 快捷键：`Ctrl + Shift + .`（macOS 为 `⌘ + Shift + .`），可在 设置 → 通用设置 → 快捷键 中改为自己喜欢的组合
- 或点击输入框工具行最左侧的图标
- 面板里可以直接输入关键词搜索，`↑↓` 选择、`Enter` 插入

### 插入与发送

- `Enter` 或点击「插入」：插入**光标处**，作为一次可撤销编辑；已有草稿保留。
- 未填参数时以**引用**插入：输入框显示 `@Action 名` 的 chip，对话里也只显示 Action 名；完整正文由插件在发送时注入给模型，不会刷屏。
- 填了参数时以**完整正文**插入：`{{args}}` 已替换为你的参数。
- `Ctrl/⌘ + Enter` 或点击「发送」：插入后立即发送当前草稿。

### 保存内容

- **把当前草稿存成 Action**：面板底部「存当前草稿」→ 填名称/分类/标签 → 保存。
- **从 Skill 导入**：管理库 →「导入」→「从 Skill 导入」→ 填项目根目录（留空扫描默认目录）→ 选择 Skill；`SKILL.md` 同目录的模板/代码文件会一并导入。
- **新建/编辑**：管理库右上角「新建 Action」，或列表行的编辑按钮。

### 资源文件

- Action 不只是一段提示词：编辑器里的「资源文件」可以添加代码、模板、文档、样例数据等。
- 每个文件 ≤ 4 MB，单条 Action 最多 64 个文件、总计 ≤ 32 MB；文件名会做安全清理，禁止 `..` 路径穿越。
- 调用 Action 时：小文本文件直接内联到 `<action_content>`；较大的或二进制文件只列出本地绝对路径和大小，模型按需读取。
- 资源只在调用时进入上下文；收藏夹本身依然不占上下文。
- 资源随 Action 一起导出/导入，复制 Action 也会复制资源目录。

### 整理

- 分类是自由文本；左侧导航自动汇总并显示数量，「管理分类」可重命名/删除。删除分类会二次确认并显示该分类下还有多少 Action；删除后它们移到未分类，Action 本身保留。
- 星标置顶；搜索支持名称、描述、分类、标签和正文。
- 「导出」得到整库 JSON；对方「导入」即可合并或替换。

## 设计

- **Host 半**（`index.js` + `store.js`）：JSON 收藏库（原子写入）、同源 `/api/dsh-action-hub` 路由、`/action` 人类命令。命令通过 `sessionController.prompt(..., mode: 'queue')` 提交一条 `source.kind = 'user'` 的真实用户消息。
- **引用机制**：输入框里显示 Action 名 chip，draft 的序列化文本仍是不透明的 `/ah-…` 标记；参考源 codec 负责把 chip 写回标记。Host 在 `agent/pre-step` 把 direct user message 中的标记展开成一条 `<action_content>` 注入消息交给模型。**不注册任何运行时 Skill**，所以技能目录、`/` 菜单、上下文面板的技能列表里都不会出现 Action；durable log 保留标记，对话里因此也只显示 Action 名。若 Action 带资源文件，同一注入消息里会附带 `<action_resources>`：小文本内联，其余给路径。
- **Client 半**（`client.js`）：注册 `conversation.input.left` 工具行按钮、`conversation.input.overlay` 会话桥、`shell.overlay` 命令面板、`main` 管理库、侧边栏图标与 `settings.section` 设置页。
- **明确不做**：不注册 `ctx.tools`，不调用 `ctx.systemPrompt.section()`；Action 只在用户明确引用时通过 `agent/pre-step` 注入一条上下文消息，收藏夹大小与每轮上下文无关。

## 数据与隐私

- 数据保存在 `~/.dsh/action-hub/actions.json`（`$DSH_HOME` 下），资源文件保存在 `~/.dsh/action-hub/resources/<id-hash>/`，写入采用临时文件 + 原子重命名。
- 设置页显示 `~/.dsh/...` 而不是带用户名的绝对路径。
- 插件只与本机 DSH Host 通信（同源 `/api/dsh-action-hub`），不发起任何外部网络请求。
- 导出文件包含正文、分类、标签、置顶状态与资源文件内容（base64）；不包含使用次数等本机统计。分享前请检查正文和资源文件是否含内部信息。

## 兼容性

- 面向 DSH 桌面版 / Web UI `0.2.x`（插件 API 仍处于预览期）。
- 管理库与面板需要 Host 的 `webServer` 服务；`/action` 命令额外需要 `commands` 与 `sessionController`，缺失时安全降级。
- 更新插件文件后刷新页面即可加载新的 `client.js`；Host 改动需要重新加载 bundle。

## 开发

```powershell
node --check index.js
node --check client.js
node --check store.js
npm test
```

- `tests/store.test.mjs`：数据模型、占位符、置顶排序、导入合并、原子持久化。
- `tests/client.test.mjs`：捕获 `window.__ModuleLoader__` 注册、纯函数与语言字典完整性，并断言不注册 tool / prompt。
- `tests/host.test.mjs`：同源校验、导出裁剪、`/action` 参数解析。

```text
dsh-action-hub/
├── package.json           # bundle 清单 + dsh.bundle / dsh.client
├── cordis.patch.yml       # Loader 行（可配 seed / dataDir）
├── index.js               # Host：路由 + /action 命令
├── store.js               # 收藏库、数据模型、导入合并
├── client.js              # Web：命令面板 / 管理库 / 设置 / 工具行按钮
├── locale/{zh,en}.json    # 插件管理器展示名
├── assets/screenshots/    # 商店截图
├── screenshots.json       # 商店截图清单
├── store/                 # awesome-dsh-plugin 收录条目
├── tests/
└── CHANGELOG.md
```

## License

MIT © 2026 AhaCrazy
