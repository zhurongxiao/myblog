---
layout: category
title: Rust 文档
permalink: /rust/
---

<h1><i class="fas fa-code"></i> Rust 文档</h1>

<ul class="post-list">
  {% for post in site.categories.rust %}
    <li>
      <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
      <span class="post-date">{{ post.date | date: "%Y-%m-%d" }}</span>
    </li>
  {% endfor %}
</ul>
