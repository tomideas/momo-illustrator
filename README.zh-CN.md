# 🎨 Momo Tools — Adobe Illustrator 扩展

简体中文 | [English](README.md)

![Momo Tools 主面板一览 — Momo Tools 与 Momo Notes](site/momo-tools-preview.png)

🎨 **认识 Momo Tools** — 一款由设计师打造的 Illustrator 外挂面板，把那些 AI 原生做不到、或做起来很慢的事，收进一个顺手的小面板里 ✨。**带着内容复制画板** 📐、**重新排列与批量更名**、**清点文档用色** 🎨、**管理品牌色库**（CMYK / JSON）、**检查文字样式 / 溢出 / 尾端空白** ✍️、**生成排版网格与页码** 📏，还有 **Momo Notes** 笔记 📝 — 主题自动跟随 Illustrator 深浅色 🌗，点按钮即执行，不用记快捷键。

| | |
|---|---|
| **安装包** | [Releases](https://github.com/tomideas/momo-illustrator/releases) — `momo-tools-*.zxp` 或 `momo-tools-*-cep.zip` |
| **使用指南** | [tomideas.github.io/momo-illustrator](https://tomideas.github.io/momo-illustrator/) |
| **版本** | v2.125 · Illustrator 17.0 – 99.9 |

## ✨ 功能

- 📐 **画板** — 复制（带内容，区别于 AI 原生复制）、重新排列、批量更名
- 🏷️ **颜色标签** — 从选中物件提取填色，自动生成色块说明
- 🔍 **颜色检查** — 用色清点、彩色编号、标出稀有色、画板图例
- 🎨 **颜色库** — 品牌标准色，以 CMYK 为准，JSON 导入导出，跨文件持久化
- ✍️ **样式检查** — 按字号 / 字体 / 颜色分组，标出少见样式与框内混合样式
- 📦 **溢出检查** — 找出区域文字溢出（印前最常见问题）
- 🧹 **尾端空白** — 清理行尾隐藏空格
- 📏 **网格系统** — 瑞士网格 / 等分网格（© canfei / 火山字型）
- 🔢 **批量页码** — 多画板自动编号
- 📝 **Momo Notes** — 独立笔记面板（多标签、Markdown 表格、Cmd+Z 撤销）

## 📦 安装

任选 **一种** 方式，安装后均需 **完全退出并重启** Illustrator。

### 方法一 — ZXP 安装（推荐）

1. 📥 从 [Releases](https://github.com/tomideas/momo-illustrator/releases) 下载最新 `momo-tools-x.xx.zxp`
2. 📥 安装 [ZXP/UXP Installer](https://aescripts.com/learn/post/zxp-installer)（macOS 或 Windows 版）
3. 📂 将 `.zxp` **拖入**安装器窗口
4. 🔄 重启 Illustrator
5. 🎨 **macOS**：`窗口` → `扩展功能` → `Momo Tools` · **Windows**：`Window` → `Extensions` → `Momo Tools`

> 截图与演示视频见 [使用指南 → 安装](https://tomideas.github.io/momo-illustrator/#install)

### 方法二 — 手动安装（CEP 文件夹）

1. 📥 从 [Releases](https://github.com/tomideas/momo-illustrator/releases) 下载 `momo-tools-x.xx-cep.zip`，解压得到 `com.tomideas.illustratortools` 文件夹（名称须保持此样）
2. 📁 复制到 CEP 扩展目录：

| 系统 | 路径 |
|------|------|
| **macOS** | `~/Library/Application Support/Adobe/CEP/extensions/com.tomideas.illustratortools/` |
| **Windows** | `%APPDATA%\Adobe\CEP\extensions\com.tomideas.illustratortools\` |

**若目录不存在，需自行创建**（首次安装 CEP 扩展时很常见）：

```bash
# macOS — 一键创建并打开
mkdir -p ~/Library/Application\ Support/Adobe/CEP/extensions
open ~/Library/Application\ Support/Adobe/CEP/extensions
```

```cmd
REM Windows
mkdir "%APPDATA%\Adobe\CEP\extensions"
explorer "%APPDATA%\Adobe\CEP\extensions"
```

将 **`com.tomideas.illustratortools`** 整个文件夹放入 `extensions`（不要只复制内部文件）。

3. 🔓 **启用未签名扩展**（首次必做 — 须先完全退出 Illustrator）：

```bash
# macOS
defaults write com.adobe.CSXS.11 PlayerDebugMode 1
defaults write com.adobe.CSXS.12 PlayerDebugMode 1
```

```cmd
REM Windows
reg add HKCU\Software\Adobe\CSXS.11 /v PlayerDebugMode /t REG_STRING /d 1 /f
reg add HKCU\Software\Adobe\CSXS.12 /v PlayerDebugMode /t REG_STRING /d 1 /f
```

4. 🔄 重启 Illustrator → 从扩展菜单打开 **Momo Tools**

### 卸载

删除 CEP 目录下的 `com.tomideas.illustratortools` 文件夹并重启 Illustrator。颜色库与笔记数据单独存放，不会被删除。

## 📖 使用指南

完整说明（HTML，GitHub Pages）：

👉 [tomideas.github.io/momo-illustrator](https://tomideas.github.io/momo-illustrator/)

源文件在 [`site/`](site/)。版本记录见 [`CHANGELOG.md`](CHANGELOG.md)。

## 🗂️ 仓库结构

```
momo-illustrator/
├── README.md              # 📄 English
├── README.zh-CN.md        # 📄 本文件（简体中文）
├── CHANGELOG.md           # 📋 版本记录
├── site/                  # 📖 使用指南（GitHub Pages）
│   ├── index.html
│   └── assets/            # 截图与演示视频
├── extension/             # 🧩 CEP 扩展源码
│   └── com.tomideas.illustratortools/
│       ├── CSXS/manifest.xml
│       ├── js/              # 面板逻辑
│       └── jsx/scripts/     # Illustrator 脚本
└── scripts/               # 🔧 打安装包脚本
```

`@Reference/`、内部开发笔记、诊断探针等 **仅保留在本地**，不会上传至此仓库。

## 💾 颜色库数据

保存在本机：

- **macOS**：`~/Library/Application Support/MomoTools/color_library.json`
- **Windows**：`%APPDATA%\MomoTools\`
- 备用：面板 `localStorage`

可通过面板 **•••** 菜单导入 / 导出 JSON 备份。

## ❓ 常见问题

**菜单里找不到 Momo Tools？**  
→ 确认已开启 PlayerDebugMode，文件夹名为 `com.tomideas.illustratortools`，并完全重启 Illustrator。

**颜色重启后变白？**  
→ 编辑色块时保持 CMYK 与 HEX 同步；建议定期导出 JSON 备份。

**更多说明**  
→ [使用指南](https://tomideas.github.io/momo-illustrator/) · [常见问题](https://tomideas.github.io/momo-illustrator/#trouble)

---

- **开发者**：Momo (tomideas)
- **许可**：见仓库发布说明
