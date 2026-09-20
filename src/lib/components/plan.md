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
- [x] Local data storage for components?
- [x] Access to render context at GT (mukha-system module)

## Data ops

- [ ](!) Do: Better namespacing of local data (page => ..page/name, component => ..componenta/id/name)
- [ ] Decide: maybe, save all page data to single JSON? Partially solves preloading problem.
- Data, saved by module, preloaded before hydration, like props?
