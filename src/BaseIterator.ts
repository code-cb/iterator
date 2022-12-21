import { Optional } from '@codecb/ts-utils/common';
import { iterate, IterateResult, SKIP, take, TERMINATE } from './IterateResult';
import { None, Option } from './Option';
import { DeepIterOrSingle, isIterDeep, VisitResult } from './utils';

export abstract class BaseIterator<Value> implements IterableIterator<Value> {
  constructor(readonly next: () => IteratorResult<Value, any>) {}

  protected abstract iterate<Result>(
    callback: (value: Value, index: number) => IterateResult<Result>,
  ): BaseIterator<Result>;

  protected abstract iterateDeep<Result>(
    input: Iterator<DeepIterOrSingle<Result>>,
  ): Iterable<Result>;

  protected abstract visit(
    visitor: (value: Value, index: number) => void | VisitResult<undefined>,
  ): void;
  protected abstract visit<Result>(
    visitor: (value: Value, index: number) => Optional<VisitResult<Result>>,
    defaultReturn: Result,
  ): Result;

  [Symbol.iterator]() {
    return this;
  }

  count(): number {
    let count = 0;
    this.visit(() => {
      ++count;
    });
    return count;
  }

  drop(limit: number): BaseIterator<Value> {
    return this.dropWhile((_value, index) => index < limit);
  }

  dropWhile<ThisArg = undefined>(
    predicate: (
      this: ThisArg,
      value: Value,
      index: number,
      iter: this,
    ) => unknown,
    thisArg?: ThisArg,
  ): BaseIterator<Value> {
    return this.iterate((value, index) =>
      predicate.call(thisArg!, value, index, this) ? SKIP : take(value),
    );
  }

  every<ThisArg = undefined>(
    predicate: (
      this: ThisArg,
      value: Value,
      index: number,
      iter: this,
    ) => unknown,
    thisArg?: ThisArg,
  ): boolean {
    return this.visit(
      (value, index) =>
        predicate.call(thisArg!, value, index, this)
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
    ) => unknown,
    thisArg?: ThisArg,
  ): BaseIterator<Value> {
    return this.iterate((value, index) =>
      predicate.call(thisArg!, value, index, this) ? take(value) : SKIP,
    );
  }

  find<Subtype extends Value, ThisArg = undefined>(
    predicate: (
      this: ThisArg,
      value: Value,
      index: number,
      iter: this,
    ) => value is Subtype,
    thisArg?: ThisArg,
  ): Option<Subtype>;
  find<ThisArg = undefined>(
    predicate: (
      this: ThisArg,
      value: Value,
      index: number,
      iter: this,
    ) => unknown,
    thisArg?: ThisArg,
  ): Option<Value>;
  find<ThisArg>(
    predicate: (
      this: ThisArg,
      value: Value,
      index: number,
      iter: this,
    ) => unknown,
    thisArg?: ThisArg,
  ): Option<Value> {
    return this.visit<Option<Value>>(
      (value, index) =>
        predicate.call(thisArg!, value, index, this)
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
    ) => DeepIterOrSingle<Result>,
    thisArg?: ThisArg,
  ): BaseIterator<Result> {
    return this.iterate((value, index) => {
      const res = mapper.call(thisArg!, value, index, this);
      return isIterDeep(res) ? iterate(this.iterateDeep(res)) : take(res);
    });
  }

  forEach<ThisArg = undefined>(
    callback: (this: ThisArg, value: Value, index: number, iter: this) => void,
    thisArg?: ThisArg,
  ): void {
    return this.visit((value, index) => {
      callback.call(thisArg!, value, index, this);
    });
  }

  includes(searchElement: Value): boolean {
    return this.some(value => Object.is(value, searchElement));
  }

  indexed(): BaseIterator<[number, Value]> {
    return this.iterate((value, index) =>
      take<[number, Value]>([index, value]),
    );
  }

  last(): Option<Value> {
    let last: Value | None = Option.none;
    this.visit(value => {
      last = value;
    });
    return Option.isNone(last) ? last : Option.some(last);
  }

  map<Result, ThisArg = undefined>(
    mapper: (this: ThisArg, value: Value, index: number, iter: this) => Result,
    thisArg?: ThisArg,
  ): BaseIterator<Result> {
    return this.iterate((value, index) =>
      take(mapper.call(thisArg!, value, index, this)),
    );
  }

  nth(n: number): Option<Value> {
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
    ) => Value,
  ): Value;
  reduce(
    reducer: (
      previousValue: Value,
      currentValue: Value,
      index: number,
      iter: this,
    ) => Value,
    initialValue: Value,
  ): Value;
  reduce<Result>(
    reducer: (
      previousValue: Result,
      currentValue: Value,
      index: number,
      iter: this,
    ) => Result,
    initialValue: Result,
  ): Result;
  reduce(
    reducer: (
      previousValue: Value,
      currentValue: Value,
      index: number,
      iter: this,
    ) => Value,
    ...args: [Value?]
  ): Value {
    let offset = 0;
    let result: Value = args[0]!;
    if (!args.length) {
      const iterResult = this.next();
      if (iterResult.done)
        throw new TypeError('Reduce of empty iterator with no initial value');
      result = iterResult.value;
      offset = 1;
    }
    this.visit((value, index) => {
      result = reducer(result, value, index + offset, this);
    });
    return result;
  }

  some<ThisArg = undefined>(
    predicate: (
      this: ThisArg,
      value: Value,
      index: number,
      iter: this,
    ) => unknown,
    thisArgs?: ThisArg,
  ): boolean {
    return this.visit<boolean>(
      (value, index) =>
        predicate.call(thisArgs!, value, index, this)
          ? { returnValue: true }
          : undefined,
      false,
    );
  }

  take(limit: number): BaseIterator<Value> {
    return this.takeWhile((_value, index) => index < limit);
  }

  takeWhile<ThisArg = undefined>(
    predicate: (
      this: ThisArg,
      value: Value,
      index: number,
      iter: this,
    ) => unknown,
    thisArg?: ThisArg,
  ): BaseIterator<Value> {
    return this.iterate<Value>((value, index) =>
      predicate.call(thisArg!, value, index, this) ? take(value) : TERMINATE,
    );
  }

  toArray(): Array<Value> {
    const arr = new Array<Value>();
    this.visit(value => {
      arr.push(value);
    });
    return arr;
  }
}

export interface BaseIterator<Value> {
  all<ThisArg>(
    predicate: (
      this: ThisArg,
      value: Value,
      index: number,
      iter: this,
    ) => unknown,
    thisArg?: ThisArg,
  ): boolean;
}
