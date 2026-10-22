# Action Hub

**给 DSH 加一个 Spotlight 式的 Action 收藏夹：常用提示词与流程，搜一下就插进输入框，不占上下文、不会被 Agent 自动调用。**

[English](README.en.md) · [更新日志](CHANGELOG.md) · [DSH 插件](https://github.com/deepseek-ai/deepseek-harness)

[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![version](https://img.shields.io/badge/version-5.1.1-green.svg)](CHANGELOG.md)
[![dsh](https://img.shields.io/badge/dsh-0.2.x-4f46e5.svg)](package.json)

![Action Hub 命令面板](assets/screenshots/01-palette.png)

## 为什么需要它

把常用提示词写成 Skill，会同时遇到两个问题：

1. **常驻上下文**：每个 Skill 的名称与描述都会进入系统提示，收藏越多，日常对话要付的 token 就越多。
2. **被动触发**：Agent 会自己判断要不要调用。像「git-svn 推送」这类流程，你只想在自己需要时执行，甚至不希望 Agent 碰它。

Action Hub 把「收藏」和「调用」分开：

- **零上下文占用**：不注册 Agent Tool，不向 system prompt 写入任何内容。收藏夹再大，每轮请求都是 0 token。
- **只由你触发**：`Alt + A`（macOS 为 `⌥ + A`）或输入框工具行的按钮打开面板；选中后以引用插入（对话里只显示 Action 名），按 Enter 才发送。
- **可整理、可分享**：分类、标签、置顶、全文搜索、单条或按选择导出 ZIP/文件夹、整库导入导出。

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
| Spotlight 面板 | `Alt + A`（macOS `⌥ + A`）或输入框工具行按钮；搜索、分类 Tab、实时预览、参数输入 |
| 键盘优先 | `↑↓` 选择、`Enter` 插入、`Ctrl/⌘+Enter` 插入并发送、`Tab` 切换分类、`Esc` 关闭 |
| 引用式插入 | 无参数时插入 Action 引用 chip：**输入框和对话里都只显示 Action 名**，正文由插件在发送时注入给模型；不注册任何 Skill |
| 快捷键可改 | 在 **设置 → 通用设置 → 快捷键** 中修改；默认 `Alt + A`（Web 注册器不接受单修饰键，未绑定时由插件直接响应，绑定后交给 DSH） |
| 光标处插入 | 使用宿主 `inputActions.insertText()`，作为一次可撤销编辑插入光标处，不覆盖已有草稿 |
| 置顶 | 星标常用 Action，面板与列表都排在最前 |
| 管理库 | 分类导航与计数、全文搜索（名称/描述/分类/标签/正文）、按最近使用/名称/创建时间排序 |
| 参数占位符 | `{{args}}` / `$ARGUMENTS` 由面板参数替换，`{{date}}` 替换为当天日期 |
| 资源文件 | 每条 Action 可附带代码、模板、说明等本地文件；调用时小文本内联，大文件给出本地路径按需读取 |
| 默认导入助手 | 内置一条「Action 导入助手」Action：把指定 Skill 目录或一段文本整理成可导入的 Action 包 |
| 导入 / 导出 | 导入单条/整库的文件夹或 ZIP；导出单条、按勾选导出或整库 ZIP |
| 分享 | 单条 Action 或整库导出为 ZIP / 文件夹；对方导入 ZIP、文件夹或 JSON 即可；每条 Action 都是一个自包含目录 |
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

- 快捷键：`Alt + A`（macOS 为 `⌥ + A`），可在 设置 → 通用设置 → 快捷键 中改为自己喜欢的组合
- 管理页快捷键：`Ctrl + Alt + A`（macOS `⌘ + ⌥ + A`），同样可在通用设置的快捷键里重绑
- Action Hub 设置页会集中显示这两个快捷键的当前绑定；DSH 通用设置的快捷键分组是固定的，没有插件分组接口，因此条目会归在「应用操作」下，并带有 `Action Hub:` 前缀
- 或点击输入框工具行最左侧的图标
- 面板里可以直接输入关键词搜索，`↑↓` 选择、`Enter` 插入

### 插入与发送

- `Enter` 或点击「插入」：插入**光标处**，作为一次可撤销编辑；已有草稿保留。
- 未填参数时以**引用**插入：输入框显示 `@Action 名` 的 chip，对话里也只显示 Action 名；完整正文由插件在发送时注入给模型，不会刷屏。
- 填了参数时以**完整正文**插入：`{{args}}` 已替换为你的参数。
- `Ctrl/⌘ + Enter` 或点击「发送」：插入后立即发送当前草稿。

### 保存内容

- **默认导入助手**：库里内置一条「Action 导入助手」。给它一个 Skill 目录，它会读取 `SKILL.md` 和资源、按 Skill→Action 的差异转换；给它一段文本，它会整理成可复用的 Action。两者都会产出一个 Action 包目录，之后用下面的「导入」导入。
- **Action 包导入**：管理库 →「导入」→「Action 包」→ 选择包含 `action.json` 的文件夹，或选择 `.zip`。导入前会先**预览**每个 Action：可以逐项选择跳过、导入为新 Action、或更新本地副本；重复内容默认跳过，本地改过的副本默认保留。内容用指纹比对，因此重复导入同一个 ZIP 不会产生副本。
- **新建/编辑**：管理库右上角「新建 Action」，或列表行的编辑按钮。

### 资源文件

- Action 目录里的 `files/` 就是资源目录；代码、模板、文档直接放进文件浏览器里的这个目录即可，插件不提供上传/删除按钮。
- 编辑器里只**只读展示** `files/` 的目录树；新增/删除文件后刷新管理库即可看到。
- 新建 Action 默认是纯文本；需要附件时，保存后在 `~/.dsh/dsh-action-hub/actions/<id>/files/` 里放文件。
- 调用 Action 时：小文本文件直接内联到 `<action_content>`；较大的或二进制文件只列出本地绝对路径和大小，模型按需读取。
- 资源只在调用时进入上下文；收藏夹本身依然不占上下文。
- 资源随 Action 一起导出/导入。

### 整理

- 分类是自由文本；左侧导航自动汇总并显示数量，「管理分类」可重命名/删除。删除分类会二次确认并显示该分类下还有多少 Action；删除后它们移到未分类，Action 本身保留。
- 星标置顶；搜索支持名称、描述、分类、标签和正文。

### 分享与备份

- 每条 Action 是一个自包含目录：
  ```
  ~/.dsh/dsh-action-hub/actions/<id>/
    action.json      元数据、prompt、资源清单
    files/...        资源文件
  ```
- Action 详情里可以**导出 ZIP**（单条 Action）。
- 管理库顶部的「导出」会打开选择列表：勾选要一起导出的 Action（默认全选），再下载所选 ZIP；只备份时直接备份 `actions/` 即可。
- 导入 → 「Action 包」：选择文件夹（单个 Action 或整个库）或 `.zip`，先看预览再执行；可以逐项选择跳过/新建/更新。重复内容按内容指纹识别，不会因重复导入同一 ZIP 而增加副本。
- 旧版整库 JSON 仍可导入（导入 → 粘贴 JSON / 选择 JSON 文件）。

## 设计

- **Host 半**（`index.js` + `store.js` + `resources.js` + `bundle.js`）：每条 Action 一个目录（`actions/<id>/action.json` + `files/`），逐条原子写入；同源 `/api/dsh-action-hub` 路由；`/action` 人类命令。命令通过 `sessionController.prompt(..., mode: 'queue')` 提交一条 `source.kind = 'user'` 的真实用户消息。
- **引用机制**：输入框里显示 Action 名 chip，draft 的序列化文本仍是不透明的 `/ah-…` 标记；参考源 codec 负责把 chip 写回标记。Host 在 `agent/pre-step` 把 direct user message 中的标记展开成一条 `<action_content>` 注入消息交给模型。**不注册任何运行时 Skill**，所以技能目录、`/` 菜单、上下文面板的技能列表里都不会出现 Action；durable log 保留标记，对话里因此也只显示 Action 名。若 Action 带资源文件，同一注入消息里会附带 `<action_resources>`：小文本内联，其余给路径。
- **Client 半**（`client.js`）：注册 `conversation.input.left` 工具行按钮、`conversation.input.overlay` 会话桥、`shell.overlay` 命令面板、`main` 管理库、侧边栏图标与 `settings.section` 设置页。
- **明确不做**：不注册 `ctx.tools`，不调用 `ctx.systemPrompt.section()`；Action 只在用户明确引用时通过 `agent/pre-step` 注入一条上下文消息，收藏夹大小与每轮上下文无关。

## 数据与隐私

- 数据保存在 `~/.dsh/dsh-action-hub/actions/<id>/`（`$DSH_HOME` 下）：`action.json` 是元数据/正文，`files/` 是资源文件；写入采用临时文件 + 原子重命名。旧版 `actions.json` 会在首次启动时迁移，旧文件改名为 `.migrated-*` 保留；旧的 `~/.dsh/action-hub` 目录也会在首次启动时自动改名为 `dsh-action-hub`。
- 设置页显示 `~/.dsh/...` 而不是带用户名的绝对路径。
- 插件只与本机 DSH Host 通信（同源 `/api/dsh-action-hub`），不发起任何外部网络请求。
- ZIP/文件夹/JSON 导出都包含正文、分类、标签、置顶状态与资源文件；不包含使用次数等本机统计。分享前请检查正文和资源文件是否含内部信息。

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
