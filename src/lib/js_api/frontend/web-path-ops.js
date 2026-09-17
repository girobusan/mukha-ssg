import { posix as path } from "path-browserify";

export function relative(from, to) {
  return path.relative(path.dirname(from), to);
}
export function resolveAbsPath(from, to) {
  return path.resolve(path.dirname(from), to);
}
