# Mukha SSG

Small and versatile static site generator.

- No external tools required (except Node.js).
- Links are relative; the site is extremely portable.
- Paginated lists (ANY lists).
- Data attachment, basic data transforms.
- Pages from data generation.
- Themes, using Nunjucks template language.
- Custom and automatically generated pages for tags.
- Standard Markdown + ability to insert rich content.

**Project is in the earliest stage.**

## Specs and requirements

### Run

- Node.js v20+

### Build

- shx not included in package.json.

## Plan

1. Convertor from L1
   - [x] blocks
   - [x] files
   - [x] test on large site
2. CLI utility
   - [x] RSS
   - [x] New list mechanics
   - [x] Improved templating
   - [x] Pack SSG code to platform-agnostic module
   - [ ] Separate backends (node-fs, node-memory)
   - [ ] Implement watch mode
3. In general
   - [x] Data attachment
   - [x] Data transforms
   - [x] Data → pages generation
   - [ ] Documentation (in process)
   - [ ] Site

#### Post-release

- [ ] Attach data for JS (future)
- [ ] WebUI

## Tasks

- [x] Template data format
- [x] HTML postprocessing
- [x] Inserts syntax
- [x] Basic, but nice theme
- [ ] Test site

मुख
