---
layout: post
title: "Rust错误类型处理完全指南"
date: 2025-04-30 10:43:45 +0800
categories: rust error-handling
author: YourName
---
# Ubuntu 系统 Rust 安装指南

::: note
本指南提供在 Ubuntu 系统上安装 Rust 编程语言的详细步骤，包含两种安装方法和常见问题解决方案。
:::

## 安装方法

::::::::: method
::: method-title
方法一：使用官方安装脚本（推荐）
:::

::: step
1\. 打开终端 (Ctrl+Alt+T)
:::

::: step
2\. 运行官方安装命令：
:::

``` bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

::: step
3\. 安装过程中：
:::

- 按回车选择默认安装（输入1）
- 安装完成后会自动添加环境变量

::: step
4\. 加载环境变量：
:::

``` bash
source $HOME/.cargo/env
```

::: step
5\. 验证安装：
:::

``` bash
rustc --version
# 应该显示类似：rustc 1.70.0 (90c541806 2023-05-31)
```
:::::::::

::::::: method
::: method-title
方法二：通过APT安装（版本可能较旧）
:::

::: step
1\. 更新软件包列表：
:::

``` bash
sudo apt update
```

::: step
2\. 安装Rust：
:::

``` bash
sudo apt install rustc cargo
```

::: step
3\. 验证安装：
:::

``` bash
rustc --version
```
:::::::

## 安装后配置

::: step
1\. 更新工具链：
:::

``` bash
rustup update
```

::: step
2\. 安装常用组件：
:::

``` bash
rustup component add rustfmt clippy rust-analysis rust-src
```

::: step
3\. 配置镜像加速（国内用户建议）：
:::

``` bash
echo '[source.crates-io]
replace-with = "ustc"

[source.ustc]
registry = "git://mirrors.ustc.edu.cn/crates.io-index"' > ~/.cargo/config
```

## 卸载Rust

``` bash
rustup self uninstall
```

## 常见问题解决

::: step
1\. 证书问题：
:::

``` bash
sudo apt install ca-certificates
```

::: step
2\. curl未安装：
:::

``` bash
sudo apt install curl
```

::: step
3\. 权限问题：
:::

``` bash
sudo chown -R $(whoami) $HOME/.cargo
```

## 开发环境准备

::: step
安装VS Code扩展：
:::

``` bash
code --install-extension rust-lang.rust-analyzer
```

::: step
创建Rust项目：
:::

``` bash
cargo new hello_world
cd hello_world
cargo run
```
