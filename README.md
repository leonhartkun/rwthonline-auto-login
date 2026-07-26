# RWTHonline Auto Login

Chrome 扩展：首次设置时输入自己的 RWTH 用户名和密码，并从本地选择自己的 TOTP Token 二维码图片。扩展仅在本机解析二维码、保存设置并生成验证码；之后在支持的 RWTH 登录页自动完成登录。

## 给用户的安装方式

正式发布后，在 Chrome 网上应用店安装扩展，点击工具栏中的扩展图标，再点击“设置账号与 Token”。在初始化页：

1. 输入自己的 RWTH 用户名和密码。
2. 从本地选择自己的 Token 二维码截图。
3. 点击“保存并启用自动登录”。

二维码、密码与 TOTP 密钥仅保存在当前设备的 Chrome 扩展本地存储中；不会上传到开发者或第三方，也不会通过 Chrome 同步到其他设备。

## 开发与验证

```sh
node --test extension/tests/totp.test.mjs extension/tests/credential_store.test.mjs
node --check extension/onboarding.js
```

在 Chrome 地址栏打开 `chrome://extensions`，启用开发者模式，选择“加载已解压的扩展程序”，并选择 `extension/` 文件夹。点击扩展图标可打开设置页面；测试完毕后可在该页面删除本地数据。

## 商店打包

执行：

```sh
./scripts/package_extension.sh
```

生成的 `dist/rwthonline_auto_login.zip` 只包含扩展运行所需的文件。它不包含开发者私钥、原生助手、日志或测试文件。

## 平台范围

这是桌面版 Chrome 扩展。Chrome 网上应用店的扩展不能作为 iPhone 或 iPad 上的 Chrome 扩展安装。

## 维护说明

- RWTH 登录页面改版后，`extension/content_script.js` 中的页面选择器可能需要更新。
- 用户可随时通过设置页更新账号、密码或二维码，或删除全部本地数据。
- 此项目与 RWTH Aachen University 没有官方隶属或背书关系。
