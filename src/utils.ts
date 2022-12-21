import { Awaitable } from '@codecb/ts-utils/common';

export type Iter<Value> = Iterator<Value> | Iterable<Value>;

export type AsyncIter<Value> = AsyncIterator<Value> | AsyncIterable<Value>;

export type AnyIterable<Value> = Iterable<Value> | AsyncIterable<Value>;

export type AnyIterator<Value> = Iterator<Value> | AsyncIterator<Value>;

export type AnyIter<Value> = Iter<Value> | AsyncIter<Value>;

export type DeepIterOrSingle<Value> = Value | Iterator<DeepIterOrSingle<Value>>;

export type DeepAsyncIterOrSingle<Value> =
  | Value
  | AsyncIterator<DeepAsyncIterOrSingle<Value>>
  | Iterator<DeepAsyncIterOrSingle<Value>>;

export interface VisitResult<Value> {
  returnValue: Value;
}

const isIterator = (value: unknown): value is AnyIterator<any> =>
  typeof value === 'object' &&
  value !== null &&
  'next' in value &&
  typeof value.next === 'function';

export function isIterDeep<Value>(
  value: DeepIterOrSingle<Value>,
): value is Iterator<DeepIterOrSingle<Value>>;
export function isIterDeep<Value>(
  value: DeepAsyncIterOrSingle<Value>,
): value is AnyIterator<DeepAsyncIterOrSingle<Value>>;
export function isIterDeep<Value>(
  value: DeepIterOrSingle<Value> | DeepAsyncIterOrSingle<Value>,
): boolean {
  return isIterator(value);
}

export const DONE: IteratorResult<any, void> = {
  done: true,
  value: undefined,
};

export const EMPTY: Iterator<any> = { next: () => DONE };

export type Comparer<Value, ThisArg = undefined> = (
  this: ThisArg,
  a: Value,
  b: Value,
) => number;

export type AsyncComparer<Value, ThisArg = undefined> = (
  this: ThisArg,
  a: Value,
  b: Value,
) => Awaitable<number>;

const boxIfNeeded = <Value>(v: Value) =>
  typeof v !== 'object' ? Object(v) : v;

export const getIterator = <Value>(iter: Iter<Value>): Iterator<Value> => {
  const boxedIter = boxIfNeeded(iter);
  return Symbol.iterator in boxedIter ? boxedIter[Symbol.iterator]() : iter;
};

export function tee<Value, Result1, Result2>(
  iter: Iter<Value>,
  mapper1: (value: Value, index: number) => Result1,
  mapper2: (value: Value, index: number) => Result2,
): [Iterator<Result1>, Iterator<Result2>];
export function tee<Value, Result1, Result2, Result3>(
  iter: Iter<Value>,
  mapper1: (value: Value, index: number) => Result1,
  mapper2: (value: Value, index: number) => Result2,
  mapper3: (value: Value, index: number) => Result3,
): [Iterator<Result1>, Iterator<Result2>, Iterator<Result3>];
export function tee<Value>(
  iter: Iter<Value>,
  ...mappers: ((value: Value, index: number) => unknown)[]
): Iterator<unknown>[] {
  const iterator = getIterator(iter);
  let cachedValues = new Array<Value>();

  return mappers.map(mapper => {
    let idx = 0;

    return {
      next: () => {
        if (idx < cachedValues.length)
          return { value: mapper(cachedValues[idx]!, idx++) };
        const res = iterator.next();
        if (res.done) return DONE;
        cachedValues.push(res.value);
        return { value: mapper(cachedValues[idx]!, idx++) };
      },
    };
  });
}

export const getAsyncIterator = <Value>(
  iter: AnyIter<Value>,
): AnyIterator<Value> => {
  const boxedIter = boxIfNeeded(iter);

  return Symbol.iterator in boxedIter
    ? boxedIter[Symbol.iterator]()
    : Symbol.asyncIterator in boxedIter
    ? boxedIter[Symbol.asyncIterator]()
    : iter;
};

export function asyncTee<Value, Result1, Result2>(
  iter: AnyIter<Value>,
  mapper1: (value: Value, index: number) => Awaitable<Result1>,
  mapper2: (value: Value, index: number) => Awaitable<Result2>,
): [AsyncIterator<Result1>, AsyncIterator<Result2>];
export function asyncTee<Value, Result1, Result2, Result3>(
  iter: AnyIter<Value>,
  mapper1: (value: Value, index: number) => Awaitable<Result1>,
  mapper2: (value: Value, index: number) => Awaitable<Result2>,
  mapper3: (value: Value, index: number) => Awaitable<Result3>,
): [AsyncIterator<Result1>, AsyncIterator<Result2>, AsyncIterator<Result3>];
export function asyncTee<Value>(
  iter: AnyIter<Value>,
  ...mappers: ((value: Value, index: number) => Awaitable<unknown>)[]
): AsyncIterator<unknown>[] {
  const iterator = getAsyncIterator(iter);
  let cachedValues = new Array<Value>();

  return mappers.map(mapper => {
    let idx = 0;

    return {
      next: async () => {
        if (idx < cachedValues.length)
          return { value: await mapper(cachedValues[idx]!, idx++) };
        const res = await iterator.next();
        if (res.done) return DONE;
        cachedValues.push(res.value);
        return { value: await mapper(cachedValues[idx]!, idx++) };
      },
    };
  });
}
