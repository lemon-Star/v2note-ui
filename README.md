# V2Note — 仿 V2EX 极简个人私有知识库 & 博客 (`lemon-Star/v2note`)

这是你的私人极简知识库与问答记录系统，灵感来自 [V2EX 问与答](https://www.v2ex.com/?tab=qna)。
本仓库为 **Private（私有）**，仅你本人 (`lemon-Star`) 可见与访问。

---

## 📌 一、 直接在 GitHub 浏览器网页中访问与维护（最快入口）

你平时甚至不需要打开任何代码编辑器，直接在浏览器收藏本仓库的 Issues 页面，就可以像刷 V2EX 一样按分类查看、发帖和盖楼记录：

### 1. 顶部几大类（点击直接按分类过滤）
- 🔹 **[全部帖子 (All)](https://github.com/lemon-Star/v2note/issues)**
- ❓ **[问与答 (遇到的问题、排查过程与最终解决方案)](https://github.com/lemon-Star/v2note/issues?q=is%3Aissue+is%3Aopen+label%3A%E9%97%AE%E4%B8%8E%E7%AD%94)**
- 💻 **[技术笔记 (代码片段、架构思考与踩坑记录)](https://github.com/lemon-Star/v2note/issues?q=is%3Aissue+is%3Aopen+label%3A%E6%8A%80%E6%9C%AF%E7%AC%94%E8%AE%B0)**
- 🚀 **[项目日志 (新项目灵感、开发进度与迭代复盘)](https://github.com/lemon-Star/v2note/issues?q=is%3Aissue+is%3Aopen+label%3A%E9%A1%B9%E7%9B%AE%E6%97%A5%E5%BF%97)**
- 📝 **[日常随笔 (读书摘要、生活思考与碎片想法)](https://github.com/lemon-Star/v2note/issues?q=is%3Aissue+is%3Aopen+label%3A%E6%97%A5%E5%B8%B8%E9%9A%8F%E7%AC%94)**
- 🏷️ **[管理 / 新增更多大类 (Labels)](https://github.com/lemon-Star/v2note/labels)**

### 2. 快捷发帖（直接归入对应大类）
- ➕ **[在「问与答」下新建帖子](https://github.com/lemon-Star/v2note/issues/new?labels=%E9%97%AE%E4%B8%8E%E7%AD%94)**
- ➕ **[在「技术笔记」下新建帖子](https://github.com/lemon-Star/v2note/issues/new?labels=%E6%8A%80%E6%9C%AF%E7%AC%94%E8%AE%B0)**
- ➕ **[在「项目日志」下新建帖子](https://github.com/lemon-Star/v2note/issues/new?labels=%E9%A1%B9%E7%9B%AE%E6%97%A5%E5%BF%97)**
- ➕ **[在「日常随笔」下新建帖子](https://github.com/lemon-Star/v2note/issues/new?labels=%E6%97%A5%E5%B8%B8%E9%9A%8F%E7%AC%94)**

### 3. 帖子里面怎么追加记录？
- 点进任何一个 Issue（帖子），直接在最下方的评论框（Write a comment）里输入内容并点击 **Comment**。
- 每一条评论就是一条带精确时间戳的 **楼层记录（#1, #2, #3...）**，支持直接粘贴剪贴板截图、代码块和 Markdown！

---

## 🖥️ 二、 使用仿 V2EX 独立前端网页访问

仓库根目录下同时包含了完整的 **仿 V2EX 极简灰白主题网页**（`index.html` / `style.css` / `app.js`）：
- 双击本地的 `index.html` 打开后，已默认填入 `lemon-Star` 和 `v2note` 仓库名。
- 首次点击右上角 **「GitHub 设置」** 粘贴你的 Token，网页就会实时拉取并同步本私有仓库的所有大类、帖子和楼层记录。
