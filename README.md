# Mukha 🌝 SSG

Small, versatile, opinionated static site generator.

🌏→ [Example site, built with **Mukha**](https://girobusan.github.io/mukha-basic-site/) (sources available)

- **No external tools**, zero dependencies.
- **Links are relative;** the site is extremely portable.
- **Paginated lists** (ANY lists).
- **Data attachment** and basic data transformations. Data can be used in templates, content, and passed to client scripts.
- **Pages from data** generation — declarative way.
- Integrated **Lunr search** (works even when page opened locally).
- **Site preview** in browser with automatic reloading.
- **Themes**, using Nunjucks template language.
- **Tags**, with custom or automatically generated pages for them.
- **Standard Markdown** + ability to insert some richer content.

**Project is in the earliest stage, but somehow usable.
Check source code of example site for reference, documentation
is on the way.**

## Install

```bash
npm install -g  mukha-ssg
```

## Create new site

```bash
mukha -n
```

Freshly created site will have minimal functionality, check example site for more.

## With new site, you can...

```bash
# preview in browser

mukha -w

# generate site files

mukha

```

## Build

```bash
git clone git@github.com:girobusan/mukha-ssg.git
cd mukha-ssg
npm install
npm run build
```

## Todo

- Documentation (on the way)
- WebUI

मुख
