const capture = require('./capture')

describe('capture.js', () => {
  describe('#nullWrapper & #undefinedWrapper', () => {
    test('should have property [wrapperSymbol]', () => {
      expect(capture.nullWrapper[capture.wrapperSymbol]).toBeDefined()
      expect(capture.undefinedWrapper[capture.wrapperSymbol]).toBeDefined()
    })

    test('#valueOf() should return null/undefined', () => {
      expect(capture.nullWrapper.valueOf()).toBeNull()
      expect(capture.undefinedWrapper.valueOf()).toBeUndefined()
    })
  })

  describe('#isWrapperType()', () => {
    test('should return true for JS native wrapper type except null/undefined', () => {
      ;[1.23, true, 'foobar'].forEach((primitiveValue) => {
        expect(capture.isWrapperType(Object(primitiveValue))).toBe(true)
      })
    })

    test('should return false for JS primitives and normal objects', () => {
      ;[1.23, true, 'foobar', null, undefined, {}].forEach((value) => {
        expect(capture.isWrapperType(value)).toBe(false)
      })
    })

    test('should return true for nullWrapper and undefinedWrapper', () => {
      expect(capture.isWrapperType(capture.nullWrapper)).toBe(true)
      expect(capture.isWrapperType(capture.undefinedWrapper)).toBe(true)
    })
  })

  describe('#wrap()', () => {
    test('should return JS native wrapper type for JS primitives except null/undefined', () => {
      ;[1.23, true, 'foobar'].forEach((primitiveValue) => {
        expect(capture.isWrapperType(capture.wrap(primitiveValue))).toBe(true)
      })
    })

    test('should return nullWrapper/undefinedWrapper for null/undefined', () => {
      expect(capture.wrap(null)).toBe(capture.nullWrapper)
      expect(capture.wrap(undefined)).toBe(capture.undefinedWrapper)
    })

    test('should return itself for objects', () => {
      const obj = {}
      expect(capture.wrap(obj)).toBe(obj)
    })
  })

  describe('#capture()', () => {
    test('should return a proxy of the object', () => {
      const obj = { foo: 123 }
      const proxy = capture(obj)
      expect(proxy[capture.contextSymbol]).toBeDefined()
      expect(proxy).toHaveProperty('foo')
      expect(proxy.foo.valueOf()).toBe(123)
    })

    test('should return a proxy of wrapper type for JS primitives except null/undefined', () => {
      ;[1.23, true, 'foobar'].forEach((primitiveValue) => {
        const proxy = capture(primitiveValue)
        expect(proxy[capture.contextSymbol]).toBeDefined()
        expect(capture.isWrapperType(proxy)).toBe(true)
      })
    })

    test('should return a proxy of nullWrapper/undefinedWrapper for null/undefined', () => {
      const nullProxy = capture(null)
      const undefinedProxy = capture(undefined)
      expect(nullProxy[capture.contextSymbol]).toBeDefined()
      expect(nullProxy).toEqual(capture.nullWrapper)
      expect(undefinedProxy[capture.contextSymbol]).toBeDefined()
      expect(undefinedProxy).toEqual(capture.undefinedWrapper)
    })

    test('should be able to capture a proxy-mixed object', () => {
      const bar = capture({ bar: 123 })
      bar.bar.desc('this is bar')
      const proxy = capture({ foo: bar })
      expect(proxy[capture.contextSymbol]).toBeDefined()
      expect(proxy.foo.bar.valueOf()).toBe(123)
    })

    test('should not return a proxy of wrapper type for normal objects', () => {
      expect(capture.isWrapperType(capture({}))).toBe(false)
    })
    ;[
      'desc',
      'required',
      'optional',
      'nullable',
      'fixed',
      'fixedType',
      'enum',
      'default',
      'sample',
      'offset',
      'limit',
    ].forEach((methodName) => {
      test(`should be able to chain ${methodName}() on returned proxy object`, () => {
        const proxy = capture({})
        expect(proxy[methodName]).toBeInstanceOf(Function)
        expect(
          proxy[methodName]('blah', 'blah', 'blah', 'blah')[methodName]
        ).toBeInstanceOf(Function)
        expect(proxy[methodName]()[methodName]).toBeInstanceOf(Function)
      })
    })

    test('should uncapture itself when uncapture() on returned proxy object is called', () => {
      expect(capture(null).uncapture()).toBeNull()
    })
  })

  describe('#typeOf()', () => {
    test('should return "array" for an array and its proxy', () => {
      expect(capture.typeOf([])).toBe('array')
      expect(capture.typeOf(capture([]))).toBe('array')
    })

    test('should return "number" for a number and its proxy', () => {
      expect(capture.typeOf(1.23)).toBe('number')
      expect(capture.typeOf(capture(1.23))).toBe('number')
    })

    test('should return "boolean" for a boolean and its proxy', () => {
      expect(capture.typeOf(true)).toBe('boolean')
      expect(capture.typeOf(capture(true))).toBe('boolean')
    })

    test('should return "string" for a string and its proxy', () => {
      expect(capture.typeOf('foobar')).toBe('string')
      expect(capture.typeOf(capture('foobar'))).toBe('string')
    })

    test('should return "object" for an object and its proxy', () => {
      expect(capture.typeOf({})).toBe('object')
      expect(capture.typeOf(capture({}))).toBe('object')
    })

    test('should return "object" for null and its proxy', () => {
      expect(capture.typeOf(null)).toBe('object')
      expect(capture.typeOf(capture(null))).toBe('object')
    })

    test('should return "object" for undefined and its proxy', () => {
      expect(capture.typeOf(undefined)).toBe('object')
      expect(capture.typeOf(capture(undefined))).toBe('object')
    })
  })

  describe('#sliceArray()', () => {
    test("should not slice array if 'offset' and 'limit' is omitted", () => {
      expect(capture.sliceArray([1, 2, 3])).toEqual([1, 2, 3])
    })

    test("should slice array from 'offset' to end if 'limit' is omitted", () => {
      expect(capture.sliceArray([1, 2, 3], 1)).toEqual([2, 3])
    })

    test("should slice array from start to 'limit' if 'offset' is omitted", () => {
      expect(capture.sliceArray([1, 2, 3], undefined, 1)).toEqual([1])
    })
  })

  describe('#traverse()', () => {
    test('should traverse an object using depth first search', () => {
      const obj = {
        a: {
          b: 1,
          c: '2',
        },
        d: 3,
      }
      ;[obj, capture(obj)].forEach((original) => {
        const visitFn = jest.fn()
        capture.traverse(original, (node) => {
          if (!node.isLeaf) return
          const nodeValue = node.value[capture.contextSymbol]
            ? node.value.uncapture()
            : node.value
          visitFn(nodeValue)
        })
        expect(visitFn.mock.calls).toEqual([[1], ['2'], [3]])
      })
    })

    test('should update nodes using `visitFn` when parameter `map` is true', () => {
      const obj = {
        a: {
          b: 4,
          c: 5,
        },
        d: 7,
      }
      ;[obj, capture(obj)].forEach((original) => {
        const transformed = capture.traverse(
          original,
          (node) => {
            const nodeValue = node.value[capture.contextSymbol]
              ? node.value.uncapture()
              : node.value
            if (!node.isLeaf) return nodeValue
            if (nodeValue > 6) return { x: nodeValue - 1 }
            return node.value - 3
          },
          true
        )
        expect(transformed).toEqual({
          a: {
            b: 1,
            c: 2,
          },
          d: { x: 3 },
        })
      })
    })
  })

  describe('#uncapture()', () => {
    test('should return an uncaptured object for a proxy', () => {
      expect(capture.undo(capture(null))).toBeNull()
    })

    test('should return itself for a normal object', () => {
      expect(capture.undo(undefined)).toBeUndefined()
    })
  })

  describe('#docs()', () => {
    test('should return documents about a proxy object', () => {
      expect(
        capture.docs(capture({ foo: 'bar' }).foo.required())
      ).toHaveProperty('required', true)
    })

    test('should return default documents for normal objects', () => {
      expect(capture.docs({})).toHaveProperty('required')
    })

    test('should return default documents for JS primitives and normal objects', () => {
      ;[1.23, true, 'foobar', null, undefined, {}].forEach((value) => {
        expect(capture.docs(value)).toHaveProperty('required')
      })
    })
  })

  describe('#module.exports', () => {
    test('should be capture() function', () => {
      expect(capture).toBe(capture.capture)
    })
    ;['undo', 'docs', 'typeOf', 'traverse'].forEach((methodName) => {
      test(`should have method ${methodName}()`, () => {
        expect(capture[methodName]).toBeInstanceOf(Function)
      })
    })
  })
})
