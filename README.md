# yhanw の小宇宙 ✨

个人主页网站 · 日系萌感风格（糖果色 · 圆角 · きらり闪耀）

参考灵感：[kirari.fun](https://kirari.fun)（zyf2007 的个人主页）与其 [AboutMe 仓库](https://github.com/zyf2007/AboutMe)。

## 页面

| 页面 | 路径 | 说明 |
| --- | --- | --- |
| 主页 | `index.html` | Hero / 关于我 / 推し / 技能 / 项目 / 时间线 / 联系 |
| 核心档案 | `aboutme/Core/CoreData.html` | 属性面板 / 好感度 / 代表技能 / 名言 / 推し |
| 博客列表 | `blog/index.html` | 文章列表（分类筛选） |
| 文章阅读 | `blog/post.html?id=xxx` | Markdown 渲染 + 上一篇/下一篇 |
| 管理后台 | `admin/index.html` | 通过 GitHub API 发布/编辑/删除文章 |

## 博客与后台说明

- 文章正文：`blog/posts/<id>.md`（纯 Markdown）
- 文章索引：`blog/data/posts.json`（标题/分类/标签/草稿标记等元信息）
- 发布流程：打开 `admin/index.html` → 填入仓库 `yhanw/yhanw.github.io` 与
  GitHub 个人访问令牌（PAT，需仓库 Contents 读写权限）→ 写文章 → 保存。
  Token 只保存在浏览器 localStorage，不会上传到任何服务器。
  建议使用仅授权本仓库的 fine-grained token。
- 保存后 GitHub Pages 会自动重新构建部署，草稿（draft）不会出现在博客列表。

## 本地预览

```bash
# 任选一种
python -m http.server 8000
npx serve .
```

然后访问 `http://localhost:8000`。

## 部署

推送到 GitHub 仓库 `yhanw.github.io` 的 main 分支即可自动发布（GitHub Pages），
或手动在仓库 Settings → Pages 中选择分支。

## 自定义

- 所有示例内容（项目、时间线、技能数值、档案信息）都在 HTML 中标注了
  `<!-- ✏️ ... -->` 注释，按注释修改即可。
- 样式与配色统一在 `css/style.css` 顶部的 `:root` token 中调整。
- 想换头像：把 `index.html`「关于我」里的星灵 SVG 替换成你的照片即可。
