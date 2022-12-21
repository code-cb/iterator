import { Optional } from '@codecb/ts-utils/common';
import { AsyncIterator, repeatImpl } from './AsyncIterator';
import { BaseIterator } from './BaseIterator';
import { IterateResult } from './IterateResult';
import {
  DeepIterOrSingle,
  DONE,
  getIterator,
  isIterDeep,
  Iter,
  tee,
  VisitResult,
} from './utils';

function* concatImpl<Value>(
  arr: Iterable<Value>[],
): Generator<Value, void, undefined> {
  for (const iter of arr) yield* iter;
}

function* cycleImpl<Value>(
  iter: Iterable<Value>,
  times?: number,
): Generator<Value, void, undefined> {
  if (times != undefined && times <= 0) return;

  const cachedValues = new Array<Value>();

  for (const value of iter) {
    yield value;
    cachedValues.push(value);
  }

  if (cachedValues.length)
    while (times == undefined || --times > 0) yield* cachedValues;
}

function* iterateImpl<Value, Result>(
  input: Iterable<Value>,
  iterator: (value: Value, index: number) => IterateResult<Result>,
): Generator<Result, void, undefined> {
  let index = 0;
  for (const value of input) {
    const res = iterator(value, index++);

    switch (res.type) {
      case 'iterate':
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

function* reverseImpl<Value>(input: Iterator<Value>): Generator<Value> {
  const res = input.next();
  if (res.done) return;
  yield* reverseImpl(input);
  yield res.value;
}

function* zipImpl<Value1, Value2>(
  iter1: Iter<Value1>,
  iter2: Iter<Value2>,
): Generator<[Value1, Value2]> {
  const iterator1 = getIterator(iter1);
  const iterator2 = getIterator(iter2);

  while (true) {
    const res1 = iterator1.next();
    const res2 = iterator2.next();
    if (res1.done || res2.done) return;
    yield [res1.value, res2.value];
  }
}

export class Iterator<Value> extends BaseIterator<Value> {
  [Symbol.toStringTag] = 'Iterator';

  static concat<Value>(...iters: Iterable<Value>[]): Iterator<Value> {
    return this.from(concatImpl(iters));
  }

  static empty<Value>(): Iterator<Value> {
    return new this(() => DONE);
  }

  static flat<Value>(
    iter: globalThis.Iterator<DeepIterOrSingle<Value>>,
  ): Iterator<Value> {
    return this.from(this.prototype.iterateDeep(iter));
  }

  static from<Value>(
    iter: globalThis.Iterator<Value> | Iterable<Value>,
  ): Iterator<Value> {
    const iterator = getIterator(iter);
    return new this<Value>(iterator.next.bind(iterator));
  }

  static repeat<Value>(value: Value, times?: number): Iterator<Value> {
    return this.from(repeatImpl(value, times));
  }

  static unzip<Value1, Value2>(
    iter: Iter<[Value1, Value2]>,
  ): [Iterator<Value1>, Iterator<Value2>] {
    const [i1, i2] = tee(
      iter,
      ([v]) => v,
      ([_, v]) => v,
    );
    return [this.from(i1), this.from(i2)];
  }

  static zip<Value1, Value2>(
    iter1: Iter<Value1>,
    iter2: Iter<Value2>,
  ): Iterator<[Value1, Value2]> {
    return this.from(zipImpl(iter1, iter2));
  }

  concat(...iters: Iterable<Value>[]): Iterator<Value> {
    return Iterator.concat(this, ...iters);
  }

  cycle(times?: number): Iterator<Value> {
    return Iterator.from(cycleImpl(this, times));
  }

  reverse(): Iterator<Value> {
    return Iterator.from(reverseImpl(this));
  }

  toAsync(): AsyncIterator<Value> {
    return AsyncIterator.from(this);
  }

  zip<Other>(iter: Iter<Other>): Iterator<[Value, Other]> {
    return Iterator.zip(this, iter);
  }

  protected iterate<Result>(
    callback: (value: Value, index: number) => IterateResult<Result>,
  ): Iterator<Result> {
    return Iterator.from(iterateImpl(this, callback));
  }

  protected *iterateDeep<Value>(
    input: globalThis.Iterator<DeepIterOrSingle<Value>>,
  ): Generator<Value> {
    while (true) {
      const res = input.next();
      if (res.done) return;
      if (!isIterDeep(res.value)) yield res.value;
      else yield* this.iterateDeep(res.value);
    }
  }

  protected visit(
    visitor: (value: Value, index: number) => void | VisitResult<undefined>,
  ): void;
  protected visit<Result>(
    visitor: (value: Value, index: number) => Optional<VisitResult<Result>>,
    defaultResult: Result,
  ): Result;
  protected visit<Result>(
    visitor: (value: Value, index: number) => Optional<VisitResult<Result>>,
    defaultResult?: Result,
  ): Result {
    for (const [index, value] of this.indexed()) {
      const res = visitor(value, index);
      if (res && 'returnValue' in res) return res.returnValue;
    }
    return defaultResult as Result;
  }
}

export interface Iterator<Value> {
  all<Subtype extends Value, ThisArg = undefined>(
    predicate: (
      this: ThisArg,
      value: Value,
      index: number,
      iter: this,
    ) => value is Subtype,
    thisArg?: ThisArg,
  ): this is Iterator<Subtype>;
  all<ThisArg = undefined>(
    predicate: (
      this: ThisArg,
      value: Value,
      index: number,
      iter: this,
    ) => unknown,
    thisArg?: ThisArg,
  ): boolean;

  any<ThisArg = undefined>(
    predicate: (
      this: ThisArg,
      value: Value,
      index: number,
      iter: this,
    ) => unknown,
    thisArgs?: ThisArg,
  ): boolean;

  chain(...iters: Iterable<Value>[]): Iterator<Value>;

  contains(searchElement: Value): boolean;

  drop(limit: number): Iterator<Value>;

  dropWhile<ThisArg = undefined>(
    predicate: (
      this: ThisArg,
      value: Value,
      index: number,
      iter: this,
    ) => unknown,
  ): Iterator<Value>;

  enumerate(): Iterator<[number, Value]>;

  every<Subtype extends Value, ThisArg = undefined>(
    predicate: (
      this: ThisArg,
      value: Value,
      index: number,
      iter: this,
    ) => value is Subtype,
    thisArg?: ThisArg,
  ): this is Iterator<Subtype>;
  every<ThisArg = undefined>(
    predicate: (
      this: ThisArg,
      value: Value,
      index: number,
      iter: this,
    ) => unknown,
    thisArg?: ThisArg,
  ): boolean;

  filter<Subtype extends Value, ThisArg = undefined>(
    predicate: (
      this: ThisArg,
      value: Value,
      index: number,
      iter: this,
    ) => value is Subtype,
    thisArg?: ThisArg,
  ): Iterator<Subtype>;
  filter<ThisArg = undefined>(
    predicate: (
      this: ThisArg,
      value: Value,
      index: number,
      iter: this,
    ) => unknown,
    thisArg?: ThisArg,
  ): Iterator<Value>;

  flatMap<Result, ThisArg = undefined>(
    mapper: (
      this: ThisArg,
      value: Value,
      index: number,
      iter: this,
    ) => DeepIterOrSingle<Result>,
    thisArg?: ThisArg,
  ): Iterator<Result>;

  indexed(): Iterator<[number, Value]>;

  map<Result, ThisArg = undefined>(
    mapper: (this: ThisArg, value: Value, index: number, iter: this) => Result,
    thisArg?: ThisArg,
  ): Iterator<Result>;

  skip(limit: number): Iterator<Value>;

  skipWhile<ThisArg = undefined>(
    predicate: (
      this: ThisArg,
      value: Value,
      index: number,
      iter: this,
    ) => unknown,
  ): Iterator<Value>;

  take(limit: number): Iterator<Value>;

  takeWhile<ThisArg = undefined>(
    predicate: (
      this: ThisArg,
      value: Value,
      index: number,
      iter: this,
    ) => unknown,
    thisArg?: ThisArg,
  ): Iterator<Value>;
}

Iterator.prototype.all = Iterator.prototype.every;
Iterator.prototype.any = Iterator.prototype.some;
Iterator.prototype.chain = Iterator.prototype.concat;
Iterator.prototype.contains = Iterator.prototype.includes;
Iterator.prototype.enumerate = Iterator.prototype.indexed;
Iterator.prototype.skip = Iterator.prototype.drop;
Iterator.prototype.skipWhile = Iterator.prototype.dropWhile;
