# 单一用途与权限说明

## 单一用途

RWTHonline Auto Login 的唯一用途是：使用用户一次性配置并保存在本机系统保险库中的 RWTH 凭据和 TOTP 信息，自动完成支持的 RWTH Aachen 登录页面所需的填写与跳转步骤。

## Native Messaging

扩展使用 Native Messaging 与用户自行安装的本机助手通信。本机助手只负责把 RWTH 用户名、密码和 TOTP 密钥保存在 macOS Keychain 或 Windows Credential Manager 中，并在登录时返回所需凭据或当前 TOTP 代码。扩展不通过此权限读取其他本机文件、执行任意命令或上传数据。

在 Chrome 保持连接期间，助手只会在第一次读取后将配置暂存在进程内存中，避免同一次浏览器会话反复访问系统保险库；连接关闭或助手退出后，该临时缓存即消失。

## Storage

扩展使用 `storage` 保存最多 50 条本地活动记录，内容为时间、自动化动作和 RWTH 主机名，以便用户在扩展弹窗中检查运行状态。账号、密码和 TOTP 密钥不保存在 Chrome Storage 中；它们由本机助手保存在系统保险库。

## Tabs

扩展使用 `tabs` 权限仅在首次设置成功后关闭其自身的设置页标签，避免用户误以为还需要重复输入配置。它不会读取浏览历史、枚举用户标签页或访问其他标签页的内容。

## 主机权限：`https://*.rwth-aachen.de/*`

扩展只在 RWTH Aachen 域名上运行。它在 `sso.rwth-aachen.de` 上识别并填写登录表单、选择已配置的 Token 方式和填写当前 TOTP 代码；在其他 RWTH Aachen 页面上只识别通往 RWTH SSO 的登录入口。该权限不会授予扩展访问其他网站的能力。
