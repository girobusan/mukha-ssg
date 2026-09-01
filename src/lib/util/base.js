export function isLittleEndianHost() {
  const buffer = new ArrayBuffer(4);
  new Uint32Array(buffer)[0] = 0x01020304;
  return new Uint8Array(buffer)[0] === 0x04;
}

export function bytesToUint32(bytes, littleEndian = false) {
  if (bytes.length !== 4) {
    throw new Error("4 bytes required");
  }

  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);

  bytes.forEach((b, i) => {
    new Uint8Array(buffer)[i] = b;
  });

  return view.getUint32(0, littleEndian);
}

export const simpleMemo = (f) => {
  let memo = {};
  return (a) => {
    if (!memo.hasOwnProperty(a)) memo[a] = f(a);
    return memo[a];
  };
};
/**
 * Creates an array of numbers in a range starting from the given start value.
 *
 * @param {number} start - The starting value (inclusive).
 * @param {number} length - The number of elements to generate.
 * @returns {number[]} An array of numbers from `start` to `start + length - 1`.
 *
 * @example
 * // Returns [5, 6, 7, 8, 9]
 * rangeArray(5, 5);
 *
 * @example
 * // Returns [0, 1, 2]
 * rangeArray(0, 3);
 */
export function rangeArray(start, length) {
  let r = [];
  for (let i = 0; i < length; i++) {
    r.push(i + start);
  }
  return r;
}

export function stringify2JSON(obj) {
  const seen = new WeakSet();
  return JSON.stringify(obj, (_, value) => {
    if (value !== null && typeof value === "object") {
      if (seen.has(value)) return;
      seen.add(value);
    }
    return value;
  });
}
