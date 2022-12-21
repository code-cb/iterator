import { assert, Equals } from '@codecb/ts-utils/common';
import { arrayOf } from '@codecb/ts-utils/list';
import { dictOf } from '@codecb/ts-utils/object';
import { BaseAsyncIterator } from 'BaseAsyncIterator';
import { Iterator as I } from 'Iterator';
import { Option } from 'Option';
import { DeepIterOrSingle } from 'utils';
import {
  assertIter,
  generatorRange,
  isUnder6,
  iterableRange,
  iteratorRange,
  multiply,
} from './_utils';

describe('Iterator', () => {
  type IK = keyof I<any>;

  const f = I.from.bind(I);

  const dm = dictOf<I<DeepIterOrSingle<number>>, number>()({
    0: f([]),
    1: f([0, f([]), 1]),
    2: f([0, f([1, f([]), 2])]),
    3: f([0, f([1, f([2, f([]), 3])])]),
    4: f([0, f([1, f([2, f([3, f([]), 4])])])]),
    5: f([0, f([1, f([2, f([3, f([4, f([]), 5])])])])]),
    6: f([0, f([1, f([2, f([3, f([4, f([5, f([]), 6])])])])])]),
  });

  const r = <Subtype extends number = number>(limit: number) =>
    f(iteratorRange(limit) as I<Subtype>);

  test(`Iterator.concat`, () => {
    expect(I.concat().toArray()).toEqual([]);
    assertIter(
      I.concat([0, 1], iterableRange(3), generatorRange(4), r(5)),
      [0, 1, 0, 1, 2, 0, 1, 2, 3, 0, 1, 2, 3, 4],
    );
    expect.assertions(2);
  });

  test(`Iterator.empty`, () => {
    expect(I.empty().toArray()).toEqual([]);
  });

  test(`Iterator.flat`, () => {
    expect(I.flat(r(0)).toArray()).toEqual([]);
    expect(
      I.flat(f([f([]), f([f([]), f([])]), f([f([f([])])])])).toArray(),
    ).toEqual([]);
    assertIter(I.flat(dm[6]), [0, 1, 2, 3, 4, 5, 6]);
    expect.assertions(3);
  });

  test(`Iterator.from`, () => {
    expect(f(iteratorRange(0)).toArray()).toEqual([]);
    assertIter(f(iteratorRange(5)), [0, 1, 2, 3, 4]);
    assertIter(f(iterableRange(7)), [0, 1, 2, 3, 4, 5, 6]);
    assertIter(f(generatorRange(6)), [0, 1, 2, 3, 4, 5]);
    assertIter(f(r(4)), [0, 1, 2, 3]);
    assertIter(f(f([95, 96, 97, 98, 99])), [95, 96, 97, 98, 99]);
    assertIter(f('xyz'), ['x', 'y', 'z']);

    const a = [101, 102, 103];
    assertIter(f(a), [101, 102, 103]);
    assertIter(f(a.keys()), [0, 1, 2]);
    assertIter(f(a.values()), [101, 102, 103]);
    assertIter(f(a.entries()), [
      [0, 101],
      [1, 102],
      [2, 103],
    ]);

    const s = new Set([{ id: 1 }, { id: 2 }, { id: 3 }]);
    assertIter(f(s), [{ id: 1 }, { id: 2 }, { id: 3 }]);
    assertIter(f(s.keys()), [{ id: 1 }, { id: 2 }, { id: 3 }]);
    assertIter(f(s.values()), [{ id: 1 }, { id: 2 }, { id: 3 }]);
    assertIter(f(s.entries()), [
      [{ id: 1 }, { id: 1 }],
      [{ id: 2 }, { id: 2 }],
      [{ id: 3 }, { id: 3 }],
    ]);

    const m = new Map([
      ['a', 99],
      ['b', 98],
      ['c', 97],
    ]);
    assertIter(f(m), [
      ['a', 99],
      ['b', 98],
      ['c', 97],
    ]);
    assertIter(f(m.keys()), ['a', 'b', 'c']);
    assertIter(f(m.values()), [99, 98, 97]);
    assertIter(f(m.entries()), [
      ['a', 99],
      ['b', 98],
      ['c', 97],
    ]);

    expect.assertions(19);
  });

  test(`Iterator.repeat`, () => {
    expect(I.repeat('a', 0).toArray()).toEqual([]);
    assertIter(I.repeat('b', 5), ['b', 'b', 'b', 'b', 'b']);
    assertIter(I.repeat('c').take(7), ['c', 'c', 'c', 'c', 'c', 'c', 'c']);
    expect.assertions(3);
  });

  test(`Iterator.unzip`, () => {
    {
      const [i1, i2] = I.unzip(f([]));
      expect(i1.toArray()).toEqual([]);
      expect(i2.toArray()).toEqual([]);
    }
    {
      // @ts-expect-error
      const [i1, i2] = I.unzip(f([1, 2, 3]));
      expect(() => i1.next()).toThrow(expect.any(Error));
      expect(() => i2.next()).toThrow(expect.any(Error));
    }
    {
      const [i1, i2] = I.unzip(
        f([
          [1, 'a'],
          [2, 'b'],
          [3, 'c'],
        ]),
      );
      assertIter(i1, [1, 2, 3]);
      assertIter(i2, ['a', 'b', 'c']);
    }
    expect.assertions(6);
  });

  test(`Iterator.zip`, () => {
    expect(I.zip(r(0), r(5)).toArray()).toEqual([]);
    expect(I.zip(r(4), r(0)).toArray()).toEqual([]);
    assertIter(
      I.zip(
        f(['a', 'b', 'c', 'd']),
        f([true, false, false, false, true, false]),
      ),
      [
        ['a', true],
        ['b', false],
        ['c', false],
        ['d', false],
      ],
    );
    assertIter(
      I.zip(
        f([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }, { id: 6 }]),
        f([{ name: 'abc' }, { name: 'def' }, { name: 'ghi' }]),
      ),
      [
        [{ id: 1 }, { name: 'abc' }],
        [{ id: 2 }, { name: 'def' }],
        [{ id: 3 }, { name: 'ghi' }],
      ],
    );
    expect.assertions(4);
  });

  test(`Iterator.prototype[Symbol.iterator]`, () => {
    {
      const i = f([4, 6, 8]);
      const iterator = i[Symbol.iterator]();
      expect(iterator.next()).toEqual({ value: 4, done: false });
      expect(iterator.next()).toEqual({ value: 6, done: false });
      expect(iterator.next()).toEqual({ value: 8, done: false });
      expect(iterator.next()).toEqual({ done: true });
    }
    {
      let expected = 0;
      for (const v of r(4)) expect(v).toBe(expected++);
    }
    {
      const a = [...r(5)];
      expect(a).toEqual([0, 1, 2, 3, 4]);
    }
    {
      const a = new Array<string>();
      a.push(...f('iterator'));
      expect(a).toEqual(['i', 't', 'e', 'r', 'a', 't', 'o', 'r']);
    }
    {
      const a = Array.from(f(new Set([1, 3, 5, 7, 9])));
      expect(a).toEqual([1, 3, 5, 7, 9]);
    }
    {
      const [b0, b1, b2, b3, b4] = f([true, true, false, true]);
      expect(b0).toBe(true);
      expect(b1).toBe(true);
      expect(b2).toBe(false);
      expect(b3).toBe(true);
      expect(b4).toBe(undefined);
    }
  });

  test.each(arrayOf<IK>()(['all', 'every']))(`Iterator.prototype.%s`, m => {
    expect(r(0)[m](() => false)).toBe(true);
    expect(r(6)[m](isUnder6)).toBe(true);
    expect(r(5)[m](v => v >= 2)).toBe(false);
    {
      const i = r(6);
      if (i.all(isUnder6)) assert<Equals<typeof i, I<0 | 1 | 2 | 3 | 4 | 5>>>();
      else assert<Equals<typeof i, I<number>>>();
    }
    {
      const i = r(6);
      if (i.every(isUnder6))
        assert<Equals<typeof i, I<0 | 1 | 2 | 3 | 4 | 5>>>();
      else assert<Equals<typeof i, I<number>>>();
    }
  });

  test.each(arrayOf<IK>()(['any', 'some']))(`Iterator.prototype.%s`, m => {
    expect(r(0)[m](() => true)).toBe(false);
    expect(r(6)[m](v => v >= 5)).toBe(true);
    expect(r(6)[m](v => v > 6)).toBe(false);
  });

  test.each(arrayOf<IK>()(['chain', 'concat']))(`Iterator.prototype.%s`, m => {
    expect(r(0)[m]().toArray()).toEqual([]);
    assertIter(r(0)[m](r(5)), [0, 1, 2, 3, 4]);
    assertIter(r(4)[m](r(0)), [0, 1, 2, 3]);
    assertIter(
      r(2)[m]([0, 1, 2], iterableRange(4), generatorRange(5), r(6)),
      [0, 1, 0, 1, 2, 0, 1, 2, 3, 0, 1, 2, 3, 4, 0, 1, 2, 3, 4, 5],
    );
    expect.assertions(4);
  });

  test.each(arrayOf<IK>()(['contains', 'includes']))(
    `Iterator.prototype.%s`,
    m => {
      expect(r(0)[m](0)).toBe(false);
      expect(r(5)[m](3)).toBe(true);
      expect(r(5)[m](5)).toBe(false);
    },
  );

  test(`Iterator.prototype.count`, () => {
    expect(r(0).count()).toBe(0);
    expect(r(24).count()).toBe(24);
  });

  test(`Iterator.prototype.cycle`, () => {
    expect(r(0).cycle().toArray()).toEqual([]);
    expect(r(0).cycle(5).toArray()).toEqual([]);
    expect(r(10).cycle(0).toArray()).toEqual([]);
    assertIter(r(6).cycle(1), [0, 1, 2, 3, 4, 5]);
    assertIter(r(4).cycle(3), [0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3]);
    assertIter(
      r(5).cycle().take(17),
      [0, 1, 2, 3, 4, 0, 1, 2, 3, 4, 0, 1, 2, 3, 4, 0, 1],
    );
    expect.assertions(6);
  });

  test.each(arrayOf<IK>()(['drop', 'skip']))(`Iterator.prototype.%s`, m => {
    expect(r(0)[m](7).toArray()).toEqual([]);
    expect(r(2)[m](2).toArray()).toEqual([]);
    assertIter(r(5)[m](0), [0, 1, 2, 3, 4]);
    assertIter(r(7)[m](3), [3, 4, 5, 6]);
    expect.assertions(4);
  });

  test.each(arrayOf<IK>()(['dropWhile', 'skipWhile']))(
    `Iterator.prototype.%s`,
    m => {
      expect(
        r(0)
          [m](() => false)
          .toArray(),
      ).toEqual([]);
      expect(
        r(5)
          [m](v => v < 10)
          .toArray(),
      ).toEqual([]);
      assertIter(
        r(6)[m](v => v > 10),
        [0, 1, 2, 3, 4, 5],
      );
      assertIter(
        r(15)[m](v => v < 11),
        [11, 12, 13, 14],
      );
      expect.assertions(4);
    },
  );

  test.each(arrayOf<IK>()(['enumerate', 'indexed']))(
    `Iterator.prototype.%s`,
    m => {
      expect(r(0)[m]().toArray()).toEqual([]);
      assertIter(r(5)[m](), [
        [0, 0],
        [1, 1],
        [2, 2],
        [3, 3],
        [4, 4],
      ]);
      expect.assertions(2);
    },
  );

  test(`Iterator.prototype.filter`, () => {
    expect(
      r(0)
        .filter(() => true)
        .toArray(),
    ).toEqual([]);
    assertIter(r(10).filter(isUnder6), [0, 1, 2, 3, 4, 5]);
    assertIter(
      r(10).filter(v => v % 3 === 0),
      [0, 3, 6, 9],
    );
    {
      const i = r(8).filter(isUnder6);
      assert<Equals<typeof i, I<0 | 1 | 2 | 3 | 4 | 5>>>();
    }
    expect.assertions(3);
  });

  test(`Iterator.prototype.find`, () => {
    expect(r(0).find(() => true)).toBe(Option.none);
    {
      const v1 = f([11, 9, 7, 5, 3, 1]).find(isUnder6);
      assert<Equals<typeof v1, Option<0 | 1 | 2 | 3 | 4 | 5>>>();
      expect(v1).toEqual(Option.some(5));
    }
    expect(r(7).find(v => v > 8)).toBe(Option.none);
  });

  test(`Iterator.prototype.flatMap`, () => {
    expect(
      r(0)
        .flatMap(() => r(10))
        .toArray(),
    ).toEqual([]);
    expect(
      r(10)
        .flatMap(() => r(0))
        .toArray(),
    ).toEqual([]);
    assertIter(
      r<keyof typeof dm>(6).flatMap(v => dm[v]),
      [0, 1, 0, 1, 2, 0, 1, 2, 3, 0, 1, 2, 3, 4, 0, 1, 2, 3, 4, 5],
    );
    expect.assertions(3);
  });

  test(`Iterator.prototype.forEach`, () => {
    {
      const cb = jest.fn();
      r(0).forEach(cb);
      expect(cb).not.toHaveBeenCalled();
    }
    {
      const expected = [0, 1, 2, 3, 4];
      r(5).forEach((v, i) => expect(v).toBe(expected[i]));
    }
    expect.assertions(6);
  });

  test(`Iterator.prototype.last`, () => {
    expect(r(0).last()).toBe(Option.none);
    expect(r(9).last()).toEqual(Option.some(8));
  });

  test(`Iterator.prototype.map`, () => {
    expect(
      r(0)
        .map(v => v * v)
        .toArray(),
    ).toEqual([]);
    assertIter(
      r(6).map((v, i) => v * i),
      [0, 1, 4, 9, 16, 25],
    );
    expect.assertions(2);
  });

  test(`Iterator.prototype.nth`, () => {
    expect(r(0).nth(2)).toBe(Option.none);
    expect(r(4).nth(5)).toBe(Option.none);
    expect(r(10).nth(6)).toEqual(Option.some(5));
  });

  test(`Iterator.prototype.reduce`, () => {
    expect(() => r(0).reduce(multiply)).toThrow(expect.any(Error));
    expect(r(0).reduce(multiply, 1)).toBe(1);
    expect(f([1, 3, 5, 7]).reduce(multiply)).toBe(105);
    expect(f([1, 3, 5, 7]).reduce(multiply, 3)).toBe(315);
  });

  test(`Iterator.prototype.reverse`, () => {
    expect(r(0).reverse().toArray()).toEqual([]);
    assertIter(r(6).reverse(), [5, 4, 3, 2, 1, 0]);
    expect.assertions(2);
  });

  test(`Iterator.prototype.take`, () => {
    expect(r(0).take(5).toArray()).toEqual([]);
    assertIter(r(3).take(9), [0, 1, 2]);
    assertIter(r(10).take(5), [0, 1, 2, 3, 4]);
    expect.assertions(3);
  });

  test(`Iterator.prototype.takeWhile`, () => {
    expect(
      r(0)
        .takeWhile(() => true)
        .toArray(),
    ).toEqual([]);
    expect(
      r(5)
        .takeWhile(v => v > 10)
        .toArray(),
    ).toEqual([]);
    assertIter(
      r(20).takeWhile(v => v < 7),
      [0, 1, 2, 3, 4, 5, 6],
    );
    expect.assertions(3);
  });

  test(`Iterator.prototype.toArray`, () => {
    expect(r(0).toArray()).toEqual([]);
    expect(r(7).toArray()).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  test(`Iterator.prototype.toAsync`, async () => {
    const i1 = r(0).toAsync();
    expect(i1).toBeInstanceOf(BaseAsyncIterator);
    await expect(i1.toArray()).resolves.toEqual([]);

    const i2 = r(5).toAsync();
    expect(i2).toBeInstanceOf(BaseAsyncIterator);
    await expect(i2.toArray()).resolves.toEqual([0, 1, 2, 3, 4]);

    expect.assertions(4);
  });

  test(`Iterator.prototype.zip`, () => {
    expect(r(0).zip(r(10)).toArray()).toEqual([]);
    expect(r(8).zip(r(0)).toArray()).toEqual([]);
    assertIter(f(['a', 'f', 'k', 't', 'z']).zip(f([true, true, false])), [
      ['a', true],
      ['f', true],
      ['k', false],
    ]);
    assertIter(
      f([4, 8, 12, 16]).zip(
        f([
          Option.none,
          Option.some('z'),
          Option.some('y'),
          Option.none,
          Option.none,
          Option.some('x'),
        ]),
      ),
      [
        [4, Option.none],
        [8, Option.some('z')],
        [12, Option.some('y')],
        [16, Option.none],
      ],
    );
    expect.assertions(4);
  });
});
