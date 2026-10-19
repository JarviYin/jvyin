---
title: 'jvyin.com 上线了'
description: '这个网站是怎么搭起来的：Astro + AWS 全 Serverless，月成本不到一美元。'
pubDate: 2026-08-14
tags: ['网站', 'AWS']
---

这个域名注册了很久，一直没想好放什么。最近决定：把这里做成一个安静的个人网站，用来写文章、放项目，外加一份 newsletter。

## 技术选型

原则很简单：**少维护、少花钱、加载快**。

- **Astro**：静态生成，文章用 Markdown 写，构建产物就是纯 HTML/CSS，没有运行时框架。
- **托管**：S3 + CloudFront + Route 53，全部在 AWS 一个账号里，月成本大约几毛钱。
- **Newsletter**：SES 发信，DynamoDB 存订阅，Lambda + API Gateway 处理订阅、双重确认和一键退订，退信自动清理。没有任何第三方服务，订阅数据完全在自己手里。

## 订阅流程

1. 在首页或 Newsletter 页面提交邮箱；
2. 收到确认邮件，点击链接完成订阅；
3. 每期邮件底部都有一键退订链接，随时可以离开。

## 接下来

- 把积压的草稿整理成文章；
- 定期写 newsletter；
- 可能加个 /now 页面，记录现在在做什么。

*（这是一篇示例文章，替换 `src/content/posts/` 下的内容即可。）*
