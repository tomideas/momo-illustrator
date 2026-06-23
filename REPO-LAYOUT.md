# Repo Layout / 仓库架构速查

| 路径 | 角色 / 说明 |
|------|------------|
| `extension/` | 产品 — Adobe Illustrator CEP 扩展完整副本（与 live 同步） |
| `site/` | 使用者说明书 — 发布为 GitHub Pages（`tomideas.github.io/momo-illustrator`） |
| `CHANGELOG.md` | 版本历史 — 逐版变更记录 |
| `README.md` | 项目介绍 — 概述、安装、功能列表 |
| `instructions.md` | AI 协作说明书 — 给 AI 工具的详细开发指引 |
| `REPO-LAYOUT.md` | 本文件 — 仓库架构一页速查 |
| `docs/` | 内部笔记 — 开发参考（ExtendScript 坑、检测算法研究） |
| `@Reference/` | 暂存 — 外部参考源（如原始网格系统） |

## GitHub Pages

- 仓库 Settings → Pages → **Build from branch: `main`** → **Folder: `/site`**
- 线上地址：https://tomideas.github.io/momo-illustrator/
