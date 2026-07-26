# RWTHonline Auto Login

RWTHonline Auto Login 是一个独立的 Chrome 扩展，用于减少支持的 RWTH Aachen 登录流程中的重复输入。首次设置后，它会在 RWTH 登录页使用你的本机凭据和当前 TOTP 验证码完成填写。

它不是 RWTH Aachen University 的官方产品，也未获得其背书。

## 安装

1. 从 Chrome 网上应用店安装扩展。
2. 打开扩展的“设置账号与 Token”页面。
3. 按页面提示安装一次本机助手。助手开源，只负责访问 macOS Keychain 或 Windows Credential Manager。
4. 输入自己的 RWTH 用户名和密码，并从本机选择自己的 Token 二维码图片。
5. 阅读并确认隐私政策与用户声明，然后保存。

之后访问支持的 RWTH 登录页时，扩展会自动处理已配置的登录步骤。需要修改账号或 Token 时，从扩展菜单选择“重新配置账号与 Token”。

完整说明见 [使用说明](USAGE.md)。数据处理方式见 [隐私政策](PRIVACY.md) 和 [用户声明](USER_NOTICE.md)。

## 数据与权限

- 账号、密码和 TOTP 密钥保存在本机系统保险库：macOS Keychain 或 Windows Credential Manager。
- Token 二维码只在本机读取；扩展不会上传凭据、二维码、验证码或活动记录。
- 扩展仅匹配 RWTH Aachen 域名，不会在其他网站运行。
- 本机助手通过 Chrome Native Messaging 与扩展通信；它不读取网页，也不向开发者发送数据。

## 支持

请先查看 [支持信息](SUPPORT.md)。Bug 报告和功能建议可提交到 [GitHub Issues](https://github.com/leonhartkun/rwthonline-auto-login/issues)。

## 开发与验证

```sh
node --test extension/tests/onboarding_ui.test.mjs extension/tests/privacy_notice.test.mjs extension/tests/icon_design.test.mjs extension/tests/totp.test.mjs
node --check extension/onboarding.js
./scripts/package_extension.sh
```

生成的 `dist/rwthonline_auto_login.zip` 是 Chrome Web Store 上传包；它不包含开发者私钥、本机助手、日志或测试文件。

## 平台范围

这是桌面版 Chrome 扩展。Chrome 网上应用店的扩展不能作为 iPhone 或 iPad 上的 Chrome 扩展安装。
