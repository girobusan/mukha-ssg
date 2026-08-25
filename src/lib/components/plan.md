## Generation time

### Before render

- List components
- Rewrite for web
- Save via js_api
- Keep components db (via jsapi)
  - component name
  - filename on site
- Require() all (deps?)

### At render

For each component call

- Build environment
- Save props via js_api
- Render component to string
- Insert to html in marked span:
  - component name
  - props data filename/id

## On client

If any components found..

- List coomponents, list deps, load all _in the right order_.

### For each found component

- Load data for hydration
- Hydrate
