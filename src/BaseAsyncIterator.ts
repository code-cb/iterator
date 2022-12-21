import { Awaitable, Optional } from '@codecb/ts-utils/common';
import {
  asyncIterate,
  AsyncIterateResult,
  SKIP,
  take,
  TERMINATE,
} from './IterateResult';
import { None, Option } from './Option';
import {
  AnyIterator,
  DeepAsyncIterOrSingle,
  isIterDeep,
  VisitResult,
} from './utils';

export abstract class BaseAsyncIterator<Value>
  implements AsyncIterableIterator<Value>
{
  constructor(readonly next: () => Promise<IteratorResult<Value, undefined>>) {}

  protected abstract iterate<Result>(
    callback: (
      value: Value,
      index: number,
    ) => Awaitable<AsyncIterateResult<Result>>,
  ): BaseAsyncIterator<Result>;

  protected abstract iterateDeep<Result>(
    input: AnyIterator<DeepAsyncIterOrSingle<Result>>,
  ): AsyncIterable<Result>;

  protected abstract visit(
    visitor: (
      value: Value,
      index: number,
    ) => Awaitable<void | VisitResult<undefined>>,
  ): Promise<void>;
  protected abstract visit<Result>(
    visitor: (
      value: Value,
      index: number,
    ) => Awaitable<Optional<VisitResult<Result>>>,
    defaultResult: Result,
  ): Promise<Result>;

  [Symbol.asyncIterator]() {
    return this;
  }

  async count(): Promise<number> {
    let count = 0;
    await this.visit(() => {
      ++count;
    });
    return count;
  }

  drop(limit: number): BaseAsyncIterator<Value> {
    return this.dropWhile((_value, index) => index < limit);
  }

  dropWhile<ThisArg = undefined>(
    predicate: (
      this: ThisArg,
      value: Value,
      index: number,
      iter: this,
    ) => Awaitable<unknown>,
    thisArg?: ThisArg,
  ): BaseAsyncIterator<Value> {
    return this.iterate(async (value, index) =>
      (await predicate.call(thisArg!, value, index, this)) ? SKIP : take(value),
    );
  }

  every<ThisArg>(
    predicate: (
      this: ThisArg,
      value: Value,
      index: number,
      iter: this,
    ) => Awaitable<unknown>,
    thisArg?: ThisArg,
  ): Promise<boolean> {
    return this.visit<boolean>(
      async (value, index) =>
        (await predicate.call(thisArg!, value, index, this))
          ? undefined
          : { returnValue: false },
      true,
    );
  }

  filter<ThisArg = undefined>(
    predicate: (
      this: ThisArg,
      value: Value,
      index: number,
      iter: this,
    ) => Awaitable<unknown>,
    thisArg?: ThisArg,
  ): BaseAsyncIterator<Value> {
    return this.iterate(async (value, index) =>
      (await predicate.call(thisArg!, value, index, this)) ? take(value) : SKIP,
    );
  }

  find<ThisArg = undefined>(
    predicate: (
      this: ThisArg,
      value: Value,
      index: number,
      iter: this,
    ) => Awaitable<unknown>,
    thisArg?: ThisArg,
  ): Promise<Option<Value>> {
    return this.visit<Option<Value>>(
      async (value, index) =>
        (await predicate.call(thisArg!, value, index, this))
          ? { returnValue: Option.some(value) }
          : undefined,
      Option.none,
    );
  }

  flatMap<Result, ThisArg = undefined>(
    mapper: (
      this: ThisArg,
      value: Value,
      index: number,
      iter: this,
    ) => Awaitable<DeepAsyncIterOrSingle<Result>>,
    thisArg?: ThisArg,
  ): BaseAsyncIterator<Result> {
    return this.iterate(async (value, index) => {
      const res = await mapper.call(thisArg!, value, index, this);
      return isIterDeep<Result>(res)
        ? asyncIterate(this.iterateDeep(res))
        : take(res);
    });
  }

  forEach<ThisArg = undefined>(
    callback: (
      this: ThisArg,
      value: Value,
      index: number,
      iter: this,
    ) => Awaitable<void>,
    thisArg?: ThisArg,
  ): Promise<void> {
    return this.visit(async (value, index) => {
      await callback.call(thisArg!, value, index, this);
    });
  }

  includes(searchElement: Value): Promise<boolean> {
    return this.some(value => Object.is(value, searchElement));
  }

  indexed(): BaseAsyncIterator<[number, Value]> {
    return this.iterate((value, index) =>
      take<[number, Value]>([index, value]),
    );
  }

  async last(): Promise<Option<Value>> {
    let last: Value | None = Option.none;
    await this.visit(value => {
      last = value;
    });
    return Option.isNone(last) ? last : Option.some(last);
  }

  map<Result, ThisArg = undefined>(
    mapper: (
      this: ThisArg,
      value: Value,
      index: number,
      iter: this,
    ) => Awaitable<Result>,
    thisArg?: ThisArg,
  ): BaseAsyncIterator<Result> {
    return this.iterate(async (value, index) =>
      take(await mapper.call(thisArg!, value, index, this)),
    );
  }

  nth(n: number): Promise<Option<Value>> {
    return this.visit(
      (value, index) =>
        index === n ? { returnValue: Option.some(value) } : undefined,
      Option.none,
    );
  }

  reduce(
    reducer: (
      previousValue: Value,
      currentValue: Value,
      index: number,
      iter: this,
    ) => Awaitable<Value>,
  ): Promise<Value>;
  reduce(
    reducer: (
      previousValue: Value,
      currentValue: Value,
      index: number,
      iter: this,
    ) => Awaitable<Value>,
    initialValue: Value,
  ): Promise<Value>;
  reduce<Result>(
    reducer: (
      previousValue: Result,
      currentValue: Value,
      index: number,
      iter: this,
    ) => Awaitable<Result>,
    initialValue: Result,
  ): Promise<Result>;
  async reduce(
    reducer: (
      previousValue: Value,
      currentValue: Value,
      index: number,
      iter: this,
    ) => Awaitable<Value>,
    ...args: [Value?]
  ): Promise<Value> {
    let offset = 0;
    let result: Value = args[0]!;
    if (!args.length) {
      const iterResult = await this.next();
      if (iterResult.done)
        throw new TypeError('Reduce of empty iterator with no initial value');
      result = iterResult.value;
      offset = 1;
    }
    await this.visit(async (value, index) => {
      result = await reducer(result, value, index + offset, this);
    });
    return result;
  }

  some<ThisArg = undefined>(
    predicate: (
      this: ThisArg,
      value: Value,
      index: number,
      iter: this,
    ) => Awaitable<unknown>,
    thisArgs?: ThisArg,
  ): Promise<boolean> {
    return this.visit<boolean>(
      async (value, index) =>
        (await predicate.call(thisArgs!, value, index, this))
          ? { returnValue: true }
          : undefined,
      false,
    );
  }

  take(limit: number): BaseAsyncIterator<Value> {
    return this.takeWhile((_value, index) => index < limit);
  }

  takeWhile<ThisArg = undefined>(
    predicate: (
      this: ThisArg,
      value: Value,
      index: number,
      iter: this,
    ) => Awaitable<unknown>,
    thisArg?: ThisArg,
  ): BaseAsyncIterator<Value> {
    return this.iterate(async (value, index) =>
      (await predicate.call(thisArg!, value, index, this))
        ? take(value)
        : TERMINATE,
    );
  }

  async toArray(): Promise<Array<Value>> {
    const arr = new Array<Value>();
    await this.visit(value => {
      arr.push(value);
    });
    return arr;
  }
}
