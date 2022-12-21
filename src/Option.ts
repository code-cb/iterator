export abstract class None {}

class NoneInstance extends None {}

export class Some<Value> {
  #value: Value;

  get value(): Value {
    return this.#value;
  }

  constructor(value: Value) {
    this.#value = value;
  }
}

export type Option<Value> = None | Some<Value>;

export const Option = {
  isNone(option: Option<any>): option is None {
    return option === Option.none;
  },
  isSome<Value>(option: Option<Value>): option is Some<Value> {
    return option instanceof Some;
  },
  none: new NoneInstance() as None,
  some<Value>(value: Value): Some<Value> {
    return new Some(value);
  },
};
