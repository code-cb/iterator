export const multiply = (a: number, b: number) => a * b;

export const iteratorRange = (limit: number): Iterator<number> => {
  let idx = 0;
  return {
    next: () =>
      idx < limit ? { value: idx++ } : { done: true, value: undefined },
  };
};

export const asyncIteratorRange = (limit: number): AsyncIterator<number> => {
  let idx = 0;
  return {
    next: async () =>
      idx < limit ? { value: idx++ } : { done: true, value: undefined },
  };
};

export const iterableRange = (limit: number): Iterable<number> => ({
  [Symbol.iterator]() {
    return iteratorRange(limit);
  },
});

export const asyncIterableRange = (limit: number): AsyncIterable<number> => ({
  [Symbol.asyncIterator]() {
    return asyncIteratorRange(limit);
  },
});

export function* generatorRange(limit: number): Generator<number> {
  for (let i = 0; i < limit; ++i) yield i;
}

export async function* asyncGeneratorRange(
  limit: number,
): AsyncGenerator<number> {
  for (let i = 0; i < limit; ++i) yield i;
}

export const isUnder6 = (v: number): v is 0 | 1 | 2 | 3 | 4 | 5 =>
  [0, 1, 2, 3, 4, 5].includes(v);

export const assertIter = <Value>(
  iter: Iterator<Value>,
  expectedValues: Value[],
): void => {
  const actualValues = new Array<Value>();
  while (true) {
    const res = iter.next();
    if (res.done) break;
    actualValues.push(res.value);
  }
  expect(actualValues).toEqual(expectedValues);
};

export const assertAsyncIter = async <Value>(
  iter: AsyncIterator<Value>,
  expectedValues: Value[],
): Promise<void> => {
  const actualValues = new Array<Value>();
  while (true) {
    const res = await iter.next();
    if (res.done) break;
    actualValues.push(res.value);
  }
  expect(actualValues).toEqual(expectedValues);
};
