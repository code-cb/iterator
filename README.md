# @codecb/iterator

🌡 An implementation of the [Iterator helpers proposal](https://github.com/tc39/proposal-iterator-helpers).

**Note:** This implementation does not strictly follow the proposal. It creates a new base class and works on interfaces (`Iterator`, `AsyncIterator`, `Iterable`, and `AsyncIterable`) rather than inheriting from the real, native [`%IteratorPrototype%` object](https://tc39.es/ecma262/#sec-%iteratorprototype%-object) which is quite awkward to access.

The interesting aspect of this project is it uses `Generator` and `AsyncGenerator` which makes it super easy to handle iteration operations comparing to writing a `next` function ourselves.

See [test cases](./test) to have a taste of what these helpers do and how to use them.

## References

1. [[GitHub] tc39/proposal-iterator-helpers](https://github.com/tc39/proposal-iterator-helpers)
1. [[tc39.es] Iterator Helpers](https://tc39.es/proposal-iterator-helpers/)
1. [[2ality] ECMAScript proposal: iterator helpers](https://2ality.com/2022/12/iterator-helpers.html)
1. [[GitHub] nvie/itertools.js](https://github.com/nvie/itertools.js)
1. [[GitHub] more-itertools/more-itertools](https://github.com/more-itertools/more-itertools)
1. [[Rust] Trait std::iter::Iterator](https://doc.rust-lang.org/std/iter/trait.Iterator.html)
1. [[Python] itertools — Functions creating iterators for efficient looping](https://docs.python.org/3/library/itertools.html)
