import { assert, describe, expect, it, test } from "vitest";
import { leftBound } from "../lib/array/binary-search";

describe(`Array`, () => {
  it("binary search", () => {
    expect(leftBound([1, 2, 3, 3, 3, 5, 7], 3)).toBe(2);
    expect(leftBound([-1, 0, 3, 5, 9, 12], 9)).toBe(4);
  });
});
