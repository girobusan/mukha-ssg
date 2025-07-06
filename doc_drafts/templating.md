---
title:Темы и шаблоны

doc: templating_ru

---

Внешнее оформление в Мухе создается при помощи тем. Доступные темы хранятся в директории `config/themes` сайта. Директории тем имеют следующую структуру:

```
📁<имя темы = название папки темы>
  |
  📁templates 
  | (здесь лежат шаблоны nunjucks)
  |
  📁assets
    (все, что лежит в этой директории, будет
    скопировано на сайт в /_theme )
```

 Муха использует шаблонизатор `nunjucks` — вот  [руководство]([Nunjucks](https://mozilla.github.io/nunjucks/templating.html)) по разработке шаблонов на нем. При рендере страницы загружается файл `index.njk`  —  он обязательно должен присутствовать в директории  templates, остальные файлы подключаются через него. Например:

{% raw %}

```jinja2
{% if page.file.path.startsWith("/index") and page.index %}
{% extends "cover.njk" %} {# заглавная страница #}
{% elseif page.tag %} {# страница тега #}
{% extends "tag.njk" %}
{% elseif page.file.path=='/tags/index.html' %} {# страница для списка меток/тегов #}
{% extends "tags.njk" %} 
{% elseif page.index %} {# подраздел #}
{% extends "subindex.njk" %}
{% else %}
{% extends "basic.njk" %}
{% endif %}
```

{% endraw %}

Вы можете создавать поддиректории внутри templates, относительная адресация между шаблонами не поддерживатеся. Если у вас есть файл `includes/footer.njk`  то включать в другие шаблоны его можно только по полному пути:

{% raw %}

```jinja2
{{ include("includes/footer.njk") }}
```

{% endraw %}


