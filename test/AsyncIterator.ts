import { arrayOf } from '@codecb/ts-utils/list';
import { dictOf } from '@codecb/ts-utils/object';
import { AsyncIterator as A } from 'AsyncIterator';
import { Option } from 'Option';
import { DeepAsyncIterOrSingle } from 'utils';
import {
  assertAsyncIter,
  asyncGeneratorRange,
  asyncIterableRange,
  asyncIteratorRange,
  generatorRange,
  isUnder6,
  iterableRange,
  iteratorRange,
  multiply,
} from './_utils';

describe(`AsyncIterator`, () => {
  type IK = keyof A<any>;

  const f = A.from.bind(A);

  const dm = dictOf<A<DeepAsyncIterOrSingle<number>>, number>()({
    0: f([]),
    1: f([0, f([]), 1]),
    2: f([0, f([1, f([]), 2])]),
    3: f([0, f([1, f([2, f([]), 3])])]),
    4: f([0, f([1, f([2, f([3, f([]), 4])])])]),
    5: f([0, f([1, f([2, f([3, f([4, f([]), 5])])])])]),
    6: f([0, f([1, f([2, f([3, f([4, f([5, f([]), 6])])])])])]),
  });

  const r = <Subtype extends number = number>(limit: number) =>
    f(iteratorRange(limit)) as A<Subtype>;

  test(`AsyncIterator.concat`, async () => {
    await expect(A.concat().toArray()).resolves.toEqual([]);
    await assertAsyncIter(
      A.concat(
        [0, 1],
        iterableRange(3),
        asyncIterableRange(4),
        generatorRange(5),
        asyncGeneratorRange(6),
        r(7),
      ),
      [
        0, 1, 0, 1, 2, 0, 1, 2, 3, 0, 1, 2, 3, 4, 0, 1, 2, 3, 4, 5, 0, 1, 2, 3,
        4, 5, 6,
      ],
    );
    expect.assertions(2);
  });

  test(`AsyncIterator.empty`, async () => {
    await expect(A.empty().toArray()).resolves.toEqual([]);
    expect.assertions(1);
  });

  test(`AsyncIterator.flat`, async () => {
    await expect(A.flat(r(0)).toArray()).resolves.toEqual([]);
    await expect(
      A.flat(f([f([]), f([f([]), f([])]), f([f([f([])])])])).toArray(),
    ).resolves.toEqual([]);
    await assertAsyncIter(A.flat(dm[6]), [0, 1, 2, 3, 4, 5, 6]);
    expect.assertions(3);
  });

  test(`AsyncIterator.from`, async () => {
    await expect(f(iteratorRange(0)).toArray()).resolves.toEqual([]);
    await assertAsyncIter(f(iteratorRange(5)), [0, 1, 2, 3, 4]);
    await assertAsyncIter(f(asyncIteratorRange(4)), [0, 1, 2, 3]);
    await assertAsyncIter(f(iterableRange(7)), [0, 1, 2, 3, 4, 5, 6]);
    await assertAsyncIter(f(asyncIterableRange(6)), [0, 1, 2, 3, 4, 5]);
    await assertAsyncIter(f(generatorRange(8)), [0, 1, 2, 3, 4, 5, 6, 7]);
    await assertAsyncIter(f(asyncGeneratorRange(3)), [0, 1, 2]);
    await assertAsyncIter(f(r(4)), [0, 1, 2, 3]);
    await assertAsyncIter(f(f([95, 96, 97, 98, 99])), [95, 96, 97, 98, 99]);

    const a = [101, 102, 103];
    await assertAsyncIter(f(a), [101, 102, 103]);
    await assertAsyncIter(f(a.keys()), [0, 1, 2]);
    await assertAsyncIter(f(a.values()), [101, 102, 103]);
    await assertAsyncIter(f(a.entries()), [
      [0, 101],
      [1, 102],
      [2, 103],
    ]);

    const s = new Set([{ id: 1 }, { id: 2 }, { id: 3 }]);
    await assertAsyncIter(f(s), [{ id: 1 }, { id: 2 }, { id: 3 }]);
    await assertAsyncIter(f(s.keys()), [{ id: 1 }, { id: 2 }, { id: 3 }]);
    await assertAsyncIter(f(s.values()), [{ id: 1 }, { id: 2 }, { id: 3 }]);
    await assertAsyncIter(f(s.entries()), [
      [{ id: 1 }, { id: 1 }],
      [{ id: 2 }, { id: 2 }],
      [{ id: 3 }, { id: 3 }],
    ]);

    const m = new Map([
      ['a', 99],
      ['b', 98],
      ['c', 97],
    ]);
    await assertAsyncIter(f(m), [
      ['a', 99],
      ['b', 98],
      ['c', 97],
    ]);
    await assertAsyncIter(f(m.keys()), ['a', 'b', 'c']);
    await assertAsyncIter(f(m.values()), [99, 98, 97]);
    await assertAsyncIter(f(m.entries()), [
      ['a', 99],
      ['b', 98],
      ['c', 97],
    ]);

    expect.assertions(21);
  });

  test(`AsyncIterator.repeat`, async () => {
    await expect(A.repeat('a', 0).toArray()).resolves.toEqual([]);
    await assertAsyncIter(A.repeat('b', 5), ['b', 'b', 'b', 'b', 'b']);
    await assertAsyncIter(A.repeat('c').take(7), [
      'c',
      'c',
      'c',
      'c',
      'c',
      'c',
      'c',
    ]);
    expect.assertions(3);
  });

  test(`AsyncIterator.unzip`, async () => {
    {
      const [i1, i2] = A.unzip(f([]));
      await expect(i1.toArray()).resolves.toEqual([]);
      await expect(i2.toArray()).resolves.toEqual([]);
    }
    {
      // @ts-expect-error
      const [i1, i2] = A.unzip(f([1, 2, 3]));
      await expect(i1.next()).rejects.toEqual(expect.any(Error));
      await expect(i2.next()).rejects.toEqual(expect.any(Error));
    }
    {
      const [i1, i2] = A.unzip(
        f([
          [1, 'a'],
          [2, 'b'],
          [3, 'c'],
        ]),
      );
      await assertAsyncIter(i1, [1, 2, 3]);
      await assertAsyncIter(i2, ['a', 'b', 'c']);
    }
    expect.assertions(6);
  });

  test(`AsyncIterator.zip`, async () => {
    await expect(A.zip(r(0), r(5)).toArray()).resolves.toEqual([]);
    await expect(A.zip(r(4), r(0)).toArray()).resolves.toEqual([]);
    await assertAsyncIter(
      A.zip(
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
    await assertAsyncIter(
      A.zip(
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

  test(`AsyncIterator.prototype[Symbol.asyncIterator]`, async () => {
    {
      const i = f([4, 6, 8]);
      const iterator = i[Symbol.asyncIterator]();
      await expect(iterator.next()).resolves.toEqual({ value: 4, done: false });
      await expect(iterator.next()).resolves.toEqual({ value: 6, done: false });
      await expect(iterator.next()).resolves.toEqual({ value: 8, done: false });
      await expect(iterator.next()).resolves.toEqual({ done: true });
    }
    {
      let expected = 0;
      for await (const v of r(4)) expect(v).toBe(expected++);
    }
    expect.assertions(8);
  });

  test.each(arrayOf<IK>()(['all', 'every']))(
    `AsyncIterator.prototype.%s`,
    async m => {
      await expect(r(0)[m](() => false)).resolves.toBe(true);
      await expect(r(6)[m](isUnder6)).resolves.toBe(true);
      await expect(r(5)[m](async v => v >= 2)).resolves.toBe(false);
      expect.assertions(3);
    },
  );

  test.each(arrayOf<IK>()(['any', 'some']))(
    `AsyncIterator.prototype.%s`,
    async m => {
      await expect(r(0)[m](() => true)).resolves.toBe(false);
      await expect(r(6)[m](async v => v >= 5)).resolves.toBe(true);
      await expect(r(6)[m](v => v > 6)).resolves.toBe(false);
      expect.assertions(3);
    },
  );

  test.each(arrayOf<IK>()(['chain', 'concat']))(
    `AsyncIterator.prototype.%s`,
    async m => {
      await expect(r(0)[m]().toArray()).resolves.toEqual([]);
      await assertAsyncIter(r(0)[m](r(5)), [0, 1, 2, 3, 4]);
      await assertAsyncIter(r(4)[m](r(0)), [0, 1, 2, 3]);
      await assertAsyncIter(
        r(2)[m](
          [0, 1, 2],
          iterableRange(4),
          asyncIterableRange(5),
          generatorRange(6),
          asyncGeneratorRange(7),
          r(8),
        ),
        [
          0, 1, 0, 1, 2, 0, 1, 2, 3, 0, 1, 2, 3, 4, 0, 1, 2, 3, 4, 5, 0, 1, 2,
          3, 4, 5, 6, 0, 1, 2, 3, 4, 5, 6, 7,
        ],
      );
      expect.assertions(4);
    },
  );

  test.each(arrayOf<IK>()(['contains', 'includes']))(
    `AsyncIterator.prototype.%s`,
    async m => {
      await expect(r(0)[m](0)).resolves.toBe(false);
      await expect(r(5)[m](3)).resolves.toBe(true);
      await expect(r(5)[m](5)).resolves.toBe(false);
      expect.assertions(3);
    },
  );

  test(`AsyncIterator.prototype.count`, async () => {
    await expect(r(0).count()).resolves.toBe(0);
    await expect(r(24).count()).resolves.toBe(24);
    expect.assertions(2);
  });

  test(`AsyncIterator.prototype.cycle`, async () => {
    await expect(r(0).cycle().toArray()).resolves.toEqual([]);
    await expect(r(0).cycle(5).toArray()).resolves.toEqual([]);
    await expect(r(10).cycle(0).toArray()).resolves.toEqual([]);
    await assertAsyncIter(r(6).cycle(1), [0, 1, 2, 3, 4, 5]);
    await assertAsyncIter(r(4).cycle(3), [0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3]);
    await assertAsyncIter(
      r(5).cycle().take(17),
      [0, 1, 2, 3, 4, 0, 1, 2, 3, 4, 0, 1, 2, 3, 4, 0, 1],
    );
    expect.assertions(6);
  });

  test.each(arrayOf<IK>()(['drop', 'skip']))(
    `AsyncIterator.prototype.%s`,
    async m => {
      await expect(r(0)[m](7).toArray()).resolves.toEqual([]);
      await expect(r(2)[m](2).toArray()).resolves.toEqual([]);
      await assertAsyncIter(r(5)[m](0), [0, 1, 2, 3, 4]);
      await assertAsyncIter(r(7)[m](3), [3, 4, 5, 6]);
      expect.assertions(4);
    },
  );

  test.each(arrayOf<IK>()(['dropWhile', 'skipWhile']))(
    `AsyncIterator.prototype.%s`,
    async m => {
      await expect(
        r(0)
          [m](() => false)
          .toArray(),
      ).resolves.toEqual([]);
      await expect(
        r(5)
          [m](v => v < 10)
          .toArray(),
      ).resolves.toEqual([]);
      await assertAsyncIter(
        r(6)[m](v => v > 10),
        [0, 1, 2, 3, 4, 5],
      );
      await assertAsyncIter(
        r(15)[m](v => v < 11),
        [11, 12, 13, 14],
      );
      expect.assertions(4);
    },
  );

  test.each(arrayOf<IK>()(['enumerate', 'indexed']))(
    `AsyncIterator.prototype.%s`,
    async m => {
      await expect(r(0)[m]().toArray()).resolves.toEqual([]);
      await assertAsyncIter(r(5)[m](), [
        [0, 0],
        [1, 1],
        [2, 2],
        [3, 3],
        [4, 4],
      ]);
      expect.assertions(2);
    },
  );

  test(`AsyncIterator.prototype.filter`, async () => {
    await expect(
      r(0)
        .filter(() => true)
        .toArray(),
    ).resolves.toEqual([]);
    await assertAsyncIter(r(10).filter(isUnder6), [0, 1, 2, 3, 4, 5]);
    await assertAsyncIter(
      r(10).filter(v => v % 3 === 0),
      [0, 3, 6, 9],
    );
    expect.assertions(3);
  });

  test(`AsyncIterator.prototype.find`, async () => {
    await expect(r(0).find(() => true)).resolves.toBe(Option.none);
    await expect(f([11, 9, 7, 5, 3, 1]).find(isUnder6)).resolves.toEqual(
      Option.some(5),
    );
    await expect(r(7).find(v => v > 8)).resolves.toBe(Option.none);
    expect.assertions(3);
  });

  test(`AsyncIterator.prototype.flatMap`, async () => {
    await expect(
      r(0)
        .flatMap(() => r(10))
        .toArray(),
    ).resolves.toEqual([]);
    await expect(
      r(10)
        .flatMap(() => r(0))
        .toArray(),
    ).resolves.toEqual([]);
    await assertAsyncIter(
      r<keyof typeof dm>(6).flatMap(v => dm[v]),
      [0, 1, 0, 1, 2, 0, 1, 2, 3, 0, 1, 2, 3, 4, 0, 1, 2, 3, 4, 5],
    );
    expect.assertions(3);
  });

  test(`AsyncIterator.prototype.forEach`, async () => {
    {
      const cb = jest.fn();
      await r(0).forEach(cb);
      expect(cb).not.toHaveBeenCalled();
    }
    {
      const expected = [0, 1, 2, 3, 4];
      await r(5).forEach((v, i) => expect(v).toBe(expected[i]));
    }
    expect.assertions(6);
  });

  test(`AsyncIterator.prototype.last`, async () => {
    await expect(r(0).last()).resolves.toBe(Option.none);
    await expect(r(9).last()).resolves.toEqual(Option.some(8));
    expect.assertions(2);
  });

  test(`AsyncIterator.prototype.map`, async () => {
    await expect(
      r(0)
        .map(v => v * v)
        .toArray(),
    ).resolves.toEqual([]);
    await assertAsyncIter(
      r(6).map((v, i) => v * i),
      [0, 1, 4, 9, 16, 25],
    );
    expect.assertions(2);
  });

  test(`AsyncIterator.prototype.nth`, async () => {
    await expect(r(0).nth(2)).resolves.toBe(Option.none);
    await expect(r(4).nth(5)).resolves.toBe(Option.none);
    await expect(r(10).nth(6)).resolves.toEqual(Option.some(5));
    expect.assertions(3);
  });

  test(`AsyncIterator.prototype.reduce`, async () => {
    await expect(r(0).reduce(multiply)).rejects.toEqual(expect.any(Error));
    await expect(r(0).reduce(multiply, 1)).resolves.toBe(1);
    await expect(f([1, 3, 5, 7]).reduce(multiply)).resolves.toBe(105);
    await expect(f([1, 3, 5, 7]).reduce(multiply, 3)).resolves.toBe(315);
    expect.assertions(4);
  });

  test(`AsyncIterator.prototype.reverse`, async () => {
    await expect(r(0).reverse().toArray()).resolves.toEqual([]);
    await assertAsyncIter(r(6).reverse(), [5, 4, 3, 2, 1, 0]);
    expect.assertions(2);
  });

  test(`AsyncIterator.prototype.take`, async () => {
    await expect(r(0).take(5).toArray()).resolves.toEqual([]);
    await assertAsyncIter(r(3).take(9), [0, 1, 2]);
    await assertAsyncIter(r(10).take(5), [0, 1, 2, 3, 4]);
    expect.assertions(3);
  });

  test(`AsyncIterator.prototype.takeWhile`, async () => {
    await expect(
      r(0)
        .takeWhile(() => true)
        .toArray(),
    ).resolves.toEqual([]);
    await expect(
      r(5)
        .takeWhile(v => v > 10)
        .toArray(),
    ).resolves.toEqual([]);
    await assertAsyncIter(
      r(20).takeWhile(v => v < 7),
      [0, 1, 2, 3, 4, 5, 6],
    );
    expect.assertions(3);
  });

  test(`AsyncIterator.prototype.toArray`, async () => {
    await expect(r(0).toArray()).resolves.toEqual([]);
    await expect(r(7).toArray()).resolves.toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect.assertions(2);
  });

  test(`AsyncIterator.prototype.zip`, async () => {
    await expect(r(0).zip(r(10)).toArray()).resolves.toEqual([]);
    await expect(r(8).zip(r(0)).toArray()).resolves.toEqual([]);
    await assertAsyncIter(
      f(['a', 'f', 'k', 't', 'z']).zip(f([true, true, false])),
      [
        ['a', true],
        ['f', true],
        ['k', false],
      ],
    );
    await assertAsyncIter(
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
