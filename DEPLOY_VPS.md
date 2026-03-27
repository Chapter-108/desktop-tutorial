# VPS 部署步骤（AlmaLinux 9.7）

## 1) 服务器一次性初始化

```bash
sudo dnf -y update
sudo dnf -y install nginx rsync firewalld
sudo systemctl enable --now firewalld
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
sudo mkdir -p /var/www/hugo/public
sudo chown -R dacm:dacm /var/www/hugo
sudo systemctl enable --now nginx
```

## 2) Nginx 站点配置

创建 `/etc/nginx/conf.d/blog.conf`：

```nginx
server {
    listen 80;
    server_name _;
    root /var/www/hugo/public;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

应用配置：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 3) GitHub Secrets（仓库 Settings -> Secrets and variables -> Actions）

- `VPS_SSH_KEY`: 私钥内容（建议专用 deploy key）
- `VPS_USER`: `dacm`
- `VPS_HOST`: 你的 VPS 公网 IP 或域名
- `VPS_REMOTE_PATH`: `/var/www/hugo/public`
- `VPS_PORT`: `22`（如有自定义端口请改）

## 4) 触发部署

- 推送到 `main` 自动触发；或在 Actions 手动运行 `Deploy static site to VPS`。

## 5) 验证

```bash
curl -I http://你的IP/
```

返回 `200` 即部署成功。
