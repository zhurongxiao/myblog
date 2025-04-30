---
layout: default
title: 首页
---

# 欢迎来到知识库

<div class="category-grid">
  {% for category in site.custom_categories %}
    <div class="category-card">
      <h2><i class="{{ category.icon }}"></i> {{ category.name }}</h2>
      <ul>
        {% assign docs = site.static_files | where_exp: "file", "file.path contains category.path" %}
        {% for doc in docs limit:5 %}
          <li><a href="{{ doc.path | relative_url }}">{{ doc.basename }}</a></li>
        {% endfor %}
      </ul>
      <a href="{{ category.path | relative_url }}" class="see-all">查看全部</a>
    </div>
  {% endfor %}
</div>