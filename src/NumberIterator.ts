import { BaseAsyncIterator } from './BaseAsyncIterator';
import { BaseIterator } from './BaseIterator';
import { Iterator } from './Iterator';
import { AsyncComparer, Comparer, DONE } from './utils';

const defaultComparer: Comparer<number, any> = (a, b) => a - b;

export class NumberIterator {
  static asyncMax<ThisArg = undefined>(
    iter: BaseAsyncIterator<number>,
    comparer: AsyncComparer<number, ThisArg> = defaultComparer,
    thisArg?: ThisArg,
  ): Promise<number> {
    return iter.reduce(async (a, b) =>
      (await comparer.call(thisArg!, a, b)) >= 0 ? a : b,
    );
  }

  static asyncMin<ThisArg = undefined>(
    iter: BaseAsyncIterator<number>,
    comparer: AsyncComparer<number, ThisArg> = defaultComparer,
    thisArg?: ThisArg,
  ): Promise<number> {
    return iter.reduce(async (a, b) =>
      (await comparer.call(thisArg!, a, b)) <= 0 ? a : b,
    );
  }

  static max<ThisArg = undefined>(
    iter: BaseIterator<number>,
    comparer: Comparer<number, ThisArg> = defaultComparer,
    thisArg?: ThisArg,
  ): number {
    return iter.reduce((a, b) => (comparer.call(thisArg!, a, b) >= 0 ? a : b));
  }

  static min<ThisArg = undefined>(
    iter: BaseIterator<number>,
    comparer: Comparer<number, ThisArg> = defaultComparer,
    thisArg?: ThisArg,
  ): number {
    return iter.reduce((a, b) => (comparer.call(thisArg!, a, b) <= 0 ? a : b));
  }

  static product(iter: BaseIterator<number>): number;
  static product(iter: BaseAsyncIterator<number>): Promise<number>;
  static product(
    iter: BaseIterator<number> | BaseAsyncIterator<number>,
  ): number | Promise<number> {
    return (iter as BaseIterator<number>).reduce((a, b) => a * b, 1);
  }

  static range(limit: number): Iterator<number>;
  static range(start: number, end: number): Iterator<number>;
  static range(start: number, end: number, step: number): Iterator<number>;
  static range(arg0: number, arg1 = NaN, step = 1): Iterator<number> {
    let start: number,
      end: number,
      signed = 1;
    if (isNaN(arg1)) {
      start = 0;
      end = arg0;
    } else {
      start = arg0;
      end = arg1;
    }
    if (start > end) signed = -1;
    const next = (): IteratorResult<number> => {
      if (signed * (start - end) >= 0) return DONE;
      const value = start;
      start += signed * Math.abs(step);
      return { value };
    };
    return new Iterator(next);
  }

  static sum(iter: BaseIterator<number>): number;
  static sum(iter: BaseAsyncIterator<number>): Promise<number>;
  static sum(
    iter: BaseIterator<number> | BaseAsyncIterator<number>,
  ): number | Promise<number> {
    return (iter as BaseIterator<number>).reduce((a, b) => a + b, 0);
  }
}
