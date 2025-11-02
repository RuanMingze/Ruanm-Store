# Ruanm应用商店

Ruanm应用商店是一个基于Electron框架开发的桌面应用程序，提供应用程序的浏览、下载与安装服务。

## 功能特点

- 支持多种常用软件的下载和管理
- 提供直观的用户界面
- 支持Windows平台NSIS安装包及便携版本生成
- 具备创建桌面快捷方式、开始菜单快捷方式等安装配置能力

## 技术栈

- Electron框架
- HTML/CSS/JavaScript
- electron-builder打包工具

## 安装依赖

```bash
npm install
```

## 运行应用

```bash
npm start
```

## 构建应用

```bash
# 构建应用
npm run build

# 仅打包不生成安装程序
npm run pack

# 生成Windows平台安装包（NSIS + 便携版）
npm run dist
```

## 许可证

本项目采用GPL-2.0许可证。