import { AsyncComparer, Comparer } from 'utils';
import { AsyncIterator as A, Iterator as I, NumberIterator as N } from '../src';
import { assertIter } from './_utils';

const absComparer: Comparer<number, void> = (a, b) => Math.abs(a) - Math.abs(b);

const asyncAbsComparer: AsyncComparer<number, void> = async (a, b) =>
  absComparer(a, b);

describe(`NumberIterator`, () => {
  test(`NumberIterator.asyncMax`, async () => {
    await expect(N.asyncMax(A.from(N.range(0)))).rejects.toEqual(
      expect.any(Error),
    );
    await expect(N.asyncMax(A.from(N.range(9)))).resolves.toBe(8);
    await expect(
      N.asyncMax(A.from([-10, -3, -1, 5, 6, 9]), asyncAbsComparer),
    ).resolves.toBe(-10);
    expect.assertions(3);
  });

  test(`NumberIterator.asyncMin`, async () => {
    await expect(N.asyncMin(A.from(N.range(0)))).rejects.toEqual(
      expect.any(Error),
    );
    await expect(N.asyncMin(A.from(N.range(9)))).resolves.toBe(0);
    await expect(
      N.asyncMin(A.from([-10, -3, -1, 5, 6, 9]), asyncAbsComparer),
    ).resolves.toBe(-1);
    expect.assertions(3);
  });

  test(`NumberIterator.max`, () => {
    expect(() => N.max(N.range(0))).toThrow(expect.any(Error));
    expect(N.max(N.range(9))).toBe(8);
    expect(N.max(I.from([-10, -3, -1, 5, 6, 9]), absComparer)).toBe(-10);
  });

  test(`NumberIterator.min`, () => {
    expect(() => N.min(N.range(0))).toThrow(expect.any(Error));
    expect(N.min(N.range(9))).toBe(0);
    expect(N.min(I.from([-10, -3, -1, 5, 6, 9]), absComparer)).toBe(-1);
  });

  test(`NumberIterator.product`, async () => {
    expect(N.product(N.range(0))).toBe(1);
    expect(N.product(N.range(1, 6))).toBe(120);
    expect(N.product(N.range(-3, 5))).toBe(-0);
    await expect(N.product(A.from(N.range(0)))).resolves.toBe(1);
    await expect(N.product(A.from(N.range(1, 6)))).resolves.toBe(120);
    await expect(N.product(A.from(N.range(-3, 5)))).resolves.toBe(-0);
    expect.assertions(6);
  });

  test(`NumberIterator.range`, () => {
    expect(N.range(0).toArray()).toEqual([]);
    assertIter(N.range(-3, 4), [-3, -2, -1, 0, 1, 2, 3]);
    assertIter(N.range(-10, 10, 3), [-10, -7, -4, -1, 2, 5, 8]);
    assertIter(N.range(5, -2), [5, 4, 3, 2, 1, 0, -1]);
    assertIter(N.range(25, -30, -8), [25, 17, 9, 1, -7, -15, -23]);
    expect.assertions(5);
  });

  test(`NumberIterator.sum`, async () => {
    expect(N.sum(N.range(0))).toBe(0);
    expect(N.sum(N.range(6))).toBe(15);
    expect(N.sum(N.range(-5, 6))).toBe(0);
    await expect(N.sum(A.from(N.range(0)))).resolves.toBe(0);
    await expect(N.sum(A.from(N.range(6)))).resolves.toBe(15);
    await expect(N.sum(A.from(N.range(-5, 6)))).resolves.toBe(0);
    expect.assertions(6);
  });
});
