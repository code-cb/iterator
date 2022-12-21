import { Awaitable, Optional } from '@codecb/ts-utils/common';
import { BaseAsyncIterator } from './BaseAsyncIterator';
import { AsyncIterateResult } from './IterateResult';
import {
  AnyIter,
  AnyIterable,
  AnyIterator,
  asyncTee,
  DeepAsyncIterOrSingle,
  EMPTY,
  getAsyncIterator,
  isIterDeep,
  VisitResult,
} from './utils';

async function* convertToAsync<Value>(
  iter: AnyIter<Value>,
): AsyncGenerator<Value> {
  const iterator = getAsyncIterator(iter);
  while (true) {
    const res = await iterator.next();
    if (res.done) return;
    yield res.value;
  }
}

async function* concatImpl<Value>(
  arr: AnyIterable<Value>[],
): AsyncGenerator<Value, void, undefined> {
  for (const iter of arr) yield* iter;
}

async function* cycleImpl<Value>(
  iter: AnyIterable<Value>,
  times?: number,
): AsyncGenerator<Value, void, undefined> {
  if (times != undefined && times <= 0) return;

  const cachedValues = new Array<Value>();

  for await (const value of iter) {
    yield value;
    cachedValues.push(value);
  }

  if (cachedValues.length)
    while (times == undefined || --times > 0) yield* cachedValues;
}

async function* iterateImpl<Value, Result>(
  input: AsyncIterable<Value>,
  callback: (
    value: Value,
    index: number,
  ) => Awaitable<AsyncIterateResult<Result>>,
): AsyncGenerator<Result, void, undefined> {
  let index = 0;
  for await (const value of input) {
    const res = await callback(value, index++);

    switch (res.type) {
      case 'asyncIterate':
        yield* res.value;
        break;

      case 'take':
        yield res.value;
        break;

      case 'terminate':
        return;

      case 'skip':
      default:
        break;
    }
  }
}

export function* repeatImpl<Value>(
  value: Value,
  times?: number,
): Generator<Value> {
  while (times == undefined || --times >= 0) yield value;
}

async function* reverseImpl<Value>(
  input: AnyIterator<Value>,
): AsyncGenerator<Value> {
  const res = await input.next();
  if (res.done) return;
  yield* reverseImpl(input);
  yield res.value;
}

async function* zipImpl<Value1, Value2>(
  iter1: AnyIter<Value1>,
  iter2: AnyIter<Value2>,
): AsyncGenerator<[Value1, Value2]> {
  const iterator1 = getAsyncIterator(iter1);
  const iterator2 = getAsyncIterator(iter2);

  while (true) {
    const [res1, res2] = await Promise.all([
      iterator1.next(),
      iterator2.next(),
    ]);
    if (res1.done || res2.done) return;
    yield [res1.value, res2.value];
  }
}

export class AsyncIterator<Value> extends BaseAsyncIterator<Value> {
  [Symbol.toStringTag] = 'Async Iterator';

  static concat<Value>(...iters: AnyIterable<Value>[]): AsyncIterator<Value> {
    return this.from(concatImpl(iters));
  }

  static empty<Value>(): AsyncIterator<Value> {
    return this.from(EMPTY);
  }

  static flat<Value>(
    iter: AnyIterator<DeepAsyncIterOrSingle<Value>>,
  ): AsyncIterator<Value> {
    return this.from(this.prototype.iterateDeep(iter));
  }

  static from<Value>(iter: AnyIter<Value>): AsyncIterator<Value> {
    const iterator = convertToAsync(iter);
    return new this<Value>(iterator.next.bind(iterator));
  }

  static repeat<Value>(value: Value, times?: number): AsyncIterator<Value> {
    return this.from(repeatImpl(value, times));
  }

  static unzip<Value1, Value2>(
    iter: AnyIter<[Value1, Value2]>,
  ): [AsyncIterator<Value1>, AsyncIterator<Value2>] {
    const [i1, i2] = asyncTee(
      iter,
      ([v]) => v,
      ([_, v]) => v,
    );
    return [this.from(i1), this.from(i2)];
  }

  static zip<Value1, Value2>(
    iter1: AnyIter<Value1>,
    iter2: AnyIter<Value2>,
  ): AsyncIterator<[Value1, Value2]> {
    return this.from(zipImpl(iter1, iter2));
  }

  concat(...iters: AnyIterable<Value>[]): AsyncIterator<Value> {
    return AsyncIterator.concat(this, ...iters);
  }

  cycle(times?: number): AsyncIterator<Value> {
    return AsyncIterator.from(cycleImpl(this, times));
  }

  reverse(): AsyncIterator<Value> {
    return AsyncIterator.from(reverseImpl(this));
  }

  zip<Other>(iter: AnyIter<Other>): AsyncIterator<[Value, Other]> {
    return AsyncIterator.zip(this, iter);
  }

  protected iterate<Result>(
    callback: (
      value: Value,
      index: number,
    ) => Awaitable<AsyncIterateResult<Result>>,
  ): AsyncIterator<Result> {
    return AsyncIterator.from(iterateImpl(this, callback));
  }

  protected async *iterateDeep<Result>(
    input: AnyIterator<DeepAsyncIterOrSingle<Result>>,
  ): AsyncGenerator<Result> {
    while (true) {
      const res = await input.next();
      if (res.done) return;
      if (!isIterDeep<Result>(res.value)) yield res.value;
      else yield* this.iterateDeep(res.value);
    }
  }

  protected visit(
    visitor: (
      value: Value,
      index: number,
    ) => Awaitable<void | VisitResult<undefined>>,
  ): Promise<void>;
  protected visit<Result>(
    visitor: (
      value: Value,
      index: number,
    ) => Awaitable<Optional<VisitResult<Result>>>,
    defaultResult: Result,
  ): Promise<Result>;
  protected async visit<Result>(
    visitor: (
      value: Value,
      index: number,
    ) => Awaitable<Optional<VisitResult<Result>>>,
    defaultResult?: Result,
  ): Promise<Result> {
    for await (const [index, value] of this.indexed()) {
      const res = await visitor(value, index);
      if (res && 'returnValue' in res) return res.returnValue;
    }
    return defaultResult as Result;
  }
}

export interface AsyncIterator<Value> {
  all<ThisArg>(
    predicate: (
      this: ThisArg,
      value: Value,
      index: number,
      iter: this,
    ) => Awaitable<unknown>,
    thisArg?: ThisArg,
  ): Promise<boolean>;

  any<ThisArg = undefined>(
    predicate: (
      this: ThisArg,
      value: Value,
      index: number,
      iter: this,
    ) => Awaitable<unknown>,
    thisArgs?: ThisArg,
  ): Promise<boolean>;

  chain(...iters: AnyIterable<Value>[]): AsyncIterator<Value>;

  contains(searchElement: Value): Promise<boolean>;

  drop(limit: number): AsyncIterator<Value>;

  dropWhile<ThisArg = undefined>(
    predicate: (
      this: ThisArg,
      value: Value,
      index: number,
      iter: this,
    ) => Awaitable<unknown>,
    thisArg?: ThisArg,
  ): AsyncIterator<Value>;

  enumerate(): AsyncIterator<[number, Value]>;

  filter<ThisArg = undefined>(
    predicate: (
      this: ThisArg,
      value: Value,
      index: number,
      iter: this,
    ) => Awaitable<unknown>,
    thisArg?: ThisArg,
  ): AsyncIterator<Value>;

  flatMap<Result, ThisArg = undefined>(
    mapper: (
      this: ThisArg,
      value: Value,
      index: number,
      iter: this,
    ) => Awaitable<DeepAsyncIterOrSingle<Result>>,
    thisArg?: ThisArg,
  ): AsyncIterator<Result>;

  indexed(): AsyncIterator<[number, Value]>;

  map<Result, ThisArg = undefined>(
    mapper: (
      this: ThisArg,
      value: Value,
      index: number,
      iter: this,
    ) => Awaitable<Result>,
    thisArg?: ThisArg,
  ): AsyncIterator<Result>;

  skip(limit: number): AsyncIterator<Value>;

  skipWhile<ThisArg = undefined>(
    predicate: (
      this: ThisArg,
      value: Value,
      index: number,
      iter: this,
    ) => Awaitable<unknown>,
    thisArg?: ThisArg,
  ): AsyncIterator<Value>;

  take(limit: number): AsyncIterator<Value>;

  takeWhile<ThisArg = undefined>(
    predicate: (
      this: ThisArg,
      value: Value,
      index: number,
      iter: this,
    ) => Awaitable<unknown>,
    thisArg?: ThisArg,
  ): AsyncIterator<Value>;
}

AsyncIterator.prototype.all = AsyncIterator.prototype.every;
AsyncIterator.prototype.any = AsyncIterator.prototype.some;
AsyncIterator.prototype.chain = AsyncIterator.prototype.concat;
AsyncIterator.prototype.contains = AsyncIterator.prototype.includes;
AsyncIterator.prototype.enumerate = AsyncIterator.prototype.indexed;
AsyncIterator.prototype.skip = AsyncIterator.prototype.drop;
AsyncIterator.prototype.skipWhile = AsyncIterator.prototype.dropWhile;
