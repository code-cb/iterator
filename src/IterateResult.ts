type Skip = { type: 'skip' };

type Terminate = { type: 'terminate' };

type Take<Value> = { type: 'take'; value: Value };

type Iterate<Value> = { type: 'iterate'; value: Iterable<Value> };

export type IterateResult<Value> =
  | Iterate<Value>
  | Skip
  | Take<Value>
  | Terminate;

type AsyncIterate<Value> = {
  type: 'asyncIterate';
  value: Iterable<Value> | AsyncIterable<Value>;
};

export type AsyncIterateResult<Value> =
  | AsyncIterate<Value>
  | Skip
  | Take<Value>
  | Terminate;

export const asyncIterate = <Value>(
  value: Iterable<Value> | AsyncIterable<Value>,
): AsyncIterate<Value> => ({ type: 'asyncIterate', value });

export const iterate = <Value>(value: Iterable<Value>): Iterate<Value> => ({
  type: 'iterate',
  value,
});

export const SKIP: Skip = { type: 'skip' };

export const take = <Value>(value: Value): Take<Value> => ({
  type: 'take',
  value,
});

export const TERMINATE: Terminate = { type: 'terminate' };
