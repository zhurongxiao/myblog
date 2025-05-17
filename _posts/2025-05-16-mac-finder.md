---
layout: post
title: "Mac Finder"
date: 2025-05-16 14:32:00 +0800
categories: mac

---

在 macOS 的 Finder（访达）中连接 FTP 服务器，可以按照以下步骤操作：

### 方法 1：通过 Finder 直接连接
1. **打开 Finder**
2. **在菜单栏选择**：
   - `前往` > `连接服务器...`（或按快捷键 `⌘ + K`）

3. **输入 FTP 地址**：
   - 格式：`ftp://服务器地址`（例如：`ftp://example.com`）
   - 如果需要端口：`ftp://example.com:21`（默认端口21可省略）

4. **点击「连接」**
5. **输入认证信息**（如果服务器需要）：
   - 选择「注册用户」
   - 输入用户名和密码
   - 可选：勾选「在我的钥匙串中记住此密码」

6. **成功连接后**：
   - FTP 服务器会像普通文件夹一样显示在 Finder 中
   - 你可以拖放文件进行上传/下载

### 方法 2：通过终端连接（命令行方式）
```bash
open ftp://username:password@example.com
```
（将 username、password 和 example.com 替换为实际信息）

### 注意事项
1. **FTP 协议安全性**：
   - 标准 FTP 是**不加密**的（密码明文传输）
   - 如果服务器支持，建议使用更安全的 `SFTP`（SSH 文件传输）或 `FTPS`（FTP over SSL）

2. **SFTP 连接方法**：
   - 在连接服务器时使用：`sftp://example.com`
   - 需要服务器支持 SSH

3. **连接问题排查**：
   - 检查网络是否正常
   - 确认服务器地址和端口正确
   - 检查防火墙设置（特别是非标准端口）
   - 尝试使用专业 FTP 客户端（如 FileZilla、Cyberduck 等）

### 专业客户端推荐（如果 Finder 功能不足）
- [FileZilla](https://filezilla-project.org/)（免费）
- [Cyberduck](https://cyberduck.io/)（免费）
- [Transmit](https://panic.com/transmit/)（付费，macOS 最佳体验）

Finder 的 FTP 功能比较基础，适合简单文件传输。如果需要断点续传、队列管理等高级功能，建议使用专业 FTP 客户端。

