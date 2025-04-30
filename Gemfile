source "https://rubygems.org"

# 核心组件
gem "jekyll", "~> 4.3.3"  # 锁定稳定版本
gem "kramdown", "~> 2.4.0"
gem "rouge", "~> 4.2.0"

# GitHub Pages官方插件
group :jekyll_plugins do
  gem "jekyll-feed", "~> 0.17"
  gem "jekyll-sitemap", "~> 1.4"
  gem "jekyll-relative-links", "~> 0.7"
  gem "jekyll-paginate", "~> 1.1"
end

# Sass处理（使用更稳定的sassc替代sass-embedded）
gem "sassc", "~> 2.4.0"
gem "jekyll-sass-converter", "~> 2.2.0"

# 平台特定依赖
platforms :mingw, :x64_mingw, :mswin, :jruby do
  gem "tzinfo", "~> 1.2"
  gem "tzinfo-data"
  gem "wdm", "~> 0.1.1"
end

# 开发工具（可选）
group :development do
  gem "jekyll-watch", "~> 2.2"
end