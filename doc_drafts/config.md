---
title: Конфигурационный файл сайта
doc: config_file_ru
lang: ru
---

Файл находится в папке `site_dir/config/site.yaml`

```yaml
# site properties
title: "Example site"
motto: "Proud to be default"
image: /path/to/image/ext
description: |-
  Long description
  of the site
author: "Incognito"
image: ""
url: "https://example.site"
theme: theme_name

# default maximum length of the list;
# max number of entries on single page
# of multipage lists
list_length: 20

#tags...
tags_dir: "/tags"
tags_page: "/tags/index.html"

#RSS props
rss_uri: "/rss.xml"
atom_uri: "/atom.xml"
#count of rss feed items
feed_length: 30
```
