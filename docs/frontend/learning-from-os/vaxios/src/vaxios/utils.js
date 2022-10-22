import { merge } from "lodash-es";
export { isFunction, cloneDeep } from "lodash-es";

/**
 * 实现对象的浅拷贝，并返回新的对象。
 */
export function shallowMerge(...objects) {
  return Object.assign({}, ...objects);
}

/**
 * 实现对象的深拷贝，并返回新的对象。
 */
export function deepMerge(...objects) {
  return merge({}, ...objects);
}

export function toBoolean(v) {
  return !!v;
}
