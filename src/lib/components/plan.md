## Generation time

### Before render

- ~~List components~~
- ~~Rewrite for web~~
- ~~Save via js_api~~
- ~~Keep components db (via jsapi)~~
  - ~~component name~~
  - ~~filename on site~~
- ~~Require() all (deps?)~~

### At render

For each component call

- ~~Build environment~~
- ~~Save props via js_api~~
- ~~Render component to string~~
- ~~Insert to html in marked span:~~
  - ~~component name~~
  - ~~props data filename/id~~

## On client

_If any components found..._

- ~~List coomponents, list deps, load all _in the right order_.~~

### For each found component

- ~~Load data for hydration~~
- ~Hydrate~~

## System API for component

- [x] Load/save global datasets (sync at render, async at frontend?)
- [ ] Local data storage for components?
- [ ] (???) Change basic data storage to one file for one page principle.
- [ ] Access to render context at GT
