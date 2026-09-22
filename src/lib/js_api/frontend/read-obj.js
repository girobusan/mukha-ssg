export function readObj(path, obj) {
  if (typeof path !== "string" || path === "") return undefined;
  return path
    .split(".")
    .reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}
