document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;

    // 1. 初始化索引
    const index = lunr(function () {
        this.ref('id');
        this.field('title', { boost: 10 });
        this.field('content');

        // 中文支持
        this.use(lunr.zh);

        // 添加文档
        {% raw %} {% assign docs = site.posts | concat: site.pages %} {% endraw %}
        const docs = [
            {% for doc in docs %}
          {
            id: {{ forloop.index }},
    title: {{ doc.title | jsonify }},
    content: {{ doc.content | strip_html | jsonify }},
    url: {{ doc.url | jsonify }}
          }{% unless forloop.last %}, {% endunless %}
    {% endfor %}
      ];

docs.forEach(doc => this.add(doc));
    });

// 2. 搜索功能
searchInput.addEventListener('input', () => {
    const results = index.search(searchInput.value);
    displayResults(results);
});

function displayResults(results) {
    const container = document.querySelector('main');
    if (!searchInput.value) {
        container.innerHTML = `{% raw %}{{ content }}{% endraw %}`;
        return;
    }

    let html = '<h2>搜索结果</h2><div class="search-results">';
    results.forEach(result => {
        html += `
          <div class="search-result">
            <h3><a href="${result.ref}">${result.title}</a></h3>
            <p>${highlightMatches(result.content, searchInput.value)}</p>
          </div>
        `;
    });
    container.innerHTML = html + '</div>';
}

function highlightMatches(text, query) {
    return text.replace(new RegExp(query, 'gi'), match => `<mark>${match}</mark>`);
}
  });