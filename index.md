---
layout: default
title: Home 
---

# Welcome to the Knowledge Base

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
      <a href="{{ category.path | relative_url }}" class="see-all">Read all</a>
    </div>
  {% endfor %}
</div>