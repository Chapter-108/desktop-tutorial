# 炼气修士 · 静态博客

基于 Icarus 风格的纯静态站点（由原 `lexburner.github.io` 导出样式改造）。

## 当前状态

- 站点标题与昵称：**炼气修士**
- 原站文章已全部移除；首页为空白占位，可后续自行添加文章页
- 侧栏已去掉原站简介、外链、微信公众号与社交图标
- 头像：`img/avatar.png`
- 搜索索引：`content.json`（当前为空文章列表）

## VPS 部署方式（GitHub Actions -> SSH + rsync）

仓库内已提供自动部署工作流：

- 文件：`.github/workflows/deploy.yml`
- 触发：push 到 `main`
- 行为：将仓库静态文件同步到 VPS 指定目录

### 需要配置的 GitHub Secrets

- `VPS_SSH_KEY`：SSH 私钥
- `VPS_USER`：VPS 登录用户（建议 `dacm`）
- `VPS_HOST`：VPS 公网 IP/域名
- `VPS_REMOTE_PATH`：站点目录（例如 `/var/www/hugo/public`）
- `VPS_PORT`：SSH 端口（默认 `22`）

## Nginx 要点

- `root` 指向 `VPS_REMOTE_PATH`
- 首页文件为 `index.html`
- 建议开启 HTTPS

