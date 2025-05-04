---
layout: post
title: "github "
date: 2025-05-04 13:03:00 +0800
categories: gather

---

## github 遇到远程已有分支提交
- 个人项目可以用以下命令覆盖推送
  
```shell
    git push --force origin master
```

## /etc/resolv.conf 被systmed修改

```shell
    sudo vim /etc/resolv.conf
```
- 注释掉
```shell
    nameserver 127.0.0.53
```
- 新增
```shell
  nameserver 8.8.8.8
  nameserver 8.8.4.4
```


## 如果曾连接过旧的 GitHub IP，可能导致冲突

```shell
    ssh-keygen -R github.com
```


## 测试连接github是否正常
```shell
    ssh -Tv git@github.com
```

- 不详细输出模式
```shell
    ssh -T git@github.com
```
> 有返回下面就是正常

```yml
    Hi zhuXXX! You've successfully authenticated, but GitHub does not provide shell access.
```