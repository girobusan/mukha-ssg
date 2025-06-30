---
title: Пример конфигурационного файла данных
doc: data_config_example_ru
---

```yaml
# add sug for making urls
- task: slugify
  dataset: tables.movies
  input_col: name
  output_col: slug

# render page for each  row
- task: render
  type: row
  dataset: tables.movies
  path: "/movies/[slug].html"
  markdown: |-
    - Company: **[[company]]**
    - Director: **[director]**
    - Year: **[[year]](/movies/year_[year].html)**
  meta:
    title: "[name]"
    date: "2022.11.22 13:30"
    croup: movies

  # render page for each unique value
  # in column
- task: render
  type: col
  dataset: tables.movies
  col: year
  path: "/movies/year_[value].html"
  # use html here, because md may mess up
  # the nunjuck syntax
  html: |-
    <ul>
    {% for p in page.local_data %}
    <li><a href="/movies/{{ p.slug }}.html">{{ p.name}}</a></li>
    {% endfor %}
    </ul>
    <hr />
  meta:
    title: "Year [value]"
    date: "2022.11.12 23.23"
    group: movie_year
```
