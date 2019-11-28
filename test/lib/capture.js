const should = require('should')

const capture = require('../../lib/capture')

suite('capture.js', function () {
  suite('#nullWrapper & #undefinedWrapper', function () {
    test('should have property [wrapperSymbol]', function () {
      capture.nullWrapper.should.have.property(capture.wrapperSymbol)
      capture.undefinedWrapper.should.have.property(capture.wrapperSymbol)
    })

    test('#valueOf() should return null/undefined', function () {
      should(capture.nullWrapper.valueOf()).be.null()
      should(capture.undefinedWrapper.valueOf()).be.undefined()
    })
  })

  suite('#isWrapperType()', function () {
    test('should return true for JS native wrapper type except null/undefined', function () {
      [1.23, true, 'foobar'].forEach(primitiveValue => {
        capture.isWrapperType(Object(primitiveValue)).should.be.true()
      })
    })

    test('should return false for JS primitives and normal objects', function () {
      [1.23, true, 'foobar', null, undefined, {}].forEach(value => {
        capture.isWrapperType(value).should.be.false()
      })
    })

    test('should return true for nullWrapper and undefinedWrapper', function () {
      capture.isWrapperType(capture.nullWrapper).should.be.true()
      capture.isWrapperType(capture.undefinedWrapper).should.be.true()
    })
  })

  suite('#wrap()', function () {
    test('should return JS native wrapper type for JS primitives except null/undefined', function () {
      [1.23, true, 'foobar'].forEach(primitiveValue => {
        capture.isWrapperType(capture.wrap(primitiveValue)).should.be.true()
      })
    })

    test('should return nullWrapper/undefinedWrapper for null/undefined', function () {
      capture.wrap(null).should.equal(capture.nullWrapper)
      capture.wrap(undefined).should.equal(capture.undefinedWrapper)
    })

    test('should return itself for objects', function () {
      const obj = {}
      capture.wrap(obj).should.equal(obj)
    })
  })

  suite('#capture()', function () {
    test('should return a proxy of the object', function () {
      const obj = { foo: 123 }
      const proxy = capture(obj)
      proxy[capture.contextSymbol].should.be.ok()
      proxy.foo.should.equal(123)
    })

    test('should return a proxy of wrapper type for JS primitives except null/undefined', function () {
      [1.23, true, 'foobar'].forEach(primitiveValue => {
        const proxy = capture(primitiveValue)
        proxy[capture.contextSymbol].should.be.ok()
        capture.isWrapperType(proxy).should.be.true()
      })
    })

    test('should return a proxy of nullWrapper/undefinedWrapper for null/undefined', function () {
      const nullProxy = capture(null)
      const undefinedProxy = capture(undefined)
      nullProxy[capture.contextSymbol].should.be.ok()
      nullProxy.should.equal(capture.nullWrapper)
      undefinedProxy[capture.contextSymbol].should.be.ok()
      undefinedProxy.should.equal(capture.undefinedWrapper)
    })

    test('should not return a proxy of wrapper type for normal objects', function () {
      capture.isWrapperType(capture({})).should.be.false()
    });

    ['desc', 'required', 'optional', 'nullable', 'fixed', 'fixedType', 'enum', 'default', 'sample', 'offset', 'limit'].forEach(methodName => {
      test(`should be able to chain ${methodName}() on returned proxy object`, function () {
        const proxy = capture({})
        proxy[methodName].should.be.a.Function()
        proxy[methodName]('blah', 'blah', 'blah', 'blah')[methodName].should.be.a.Function()
      })
    })

    test('should uncapture itself when uncapture() on returned proxy object is called', function () {
      should(capture(null).uncapture()).be.null()
    })
  })

  suite('#typeOf()', function () {
    test('should return "array" for an array and its proxy', function () {
      capture.typeOf([]).should.equal('array')
      capture.typeOf(capture([])).should.equal('array')
    })

    test('should return "number" for a number and its proxy', function () {
      capture.typeOf(1.23).should.equal('number')
      capture.typeOf(capture(1.23)).should.equal('number')
    })

    test('should return "boolean" for a boolean and its proxy', function () {
      capture.typeOf(true).should.equal('boolean')
      capture.typeOf(capture(true)).should.equal('boolean')
    })

    test('should return "string" for a string and its proxy', function () {
      capture.typeOf('foobar').should.equal('string')
      capture.typeOf(capture('foobar')).should.equal('string')
    })

    test('should return "object" for an object and its proxy', function () {
      capture.typeOf({}).should.equal('object')
      capture.typeOf(capture({})).should.equal('object')
    })

    test('should return "object" for null and its proxy', function () {
      capture.typeOf(null).should.equal('object')
      capture.typeOf(capture(null)).should.equal('object')
    })

    test('should return "object" for undefined and its proxy', function () {
      capture.typeOf(undefined).should.equal('object')
      capture.typeOf(capture(undefined)).should.equal('object')
    })
  })

  suite('#traverse()', function () {
    test('should traverse an object using depth first search', function () {
      const obj = {
        a: {
          b: 1,
          c: 2
        },
        d: 3
      };
      [obj, capture(obj)].forEach(obj => {
        let visited = ''
        capture.traverse(obj, node => {
          if (!node.isLeaf) return
          visited += node.value
        })
        visited.should.equal('123')
      })
    })

    test('should update nodes using `visitFn` when parameter `map` is true', function () {
      const obj = {
        a: {
          b: 4,
          c: 5
        },
        d: 6
      };
      [obj, capture(obj)].forEach(obj => {
        let visited = ''
        capture.traverse(obj, node => {
          const nodeValue = node.value[capture.contextSymbol] ? node.value.uncapture() : node.value
          if (!node.isLeaf) return nodeValue
          if (nodeValue > 3) return Array(nodeValue).fill({ x: nodeValue - 3 })
          visited += nodeValue
          return node.value
        }, true)
        visited.should.equal('111122222333333')
      })
    })
  })

  suite('#uncapture()', function () {
    test('should return an uncaptured object for a proxy', function () {
      should(capture.undo(capture(null))).be.null()
    })

    test('should return itself for a normal object', function () {
      should(capture.undo(undefined)).be.undefined()
    })
  })

  suite('#docs()', function () {
    test('should return documents about a proxy object', function () {
      capture.docs(capture({ foo: 'bar' }).foo.required()).should.have.property('required', true)
    })

    test('should return default documents for normal objects', function () {
      capture.docs({}).should.have.property('required')
    })

    test('should return default documents for JS primitives and normal objects', function () {
      [1.23, true, 'foobar', null, undefined, {}].forEach(value => {
        capture.docs(value).should.have.property('required')
      })
    })
  })

  suite('#module.exports', function () {
    test('should be capture() function', function () {
      capture.should.equal(capture.capture)
    });

    ['undo', 'docs', 'typeOf', 'traverse'].forEach(methodName => {
      test(`should have method ${methodName}()`, function () {
        capture[methodName].should.be.a.Function()
      })
    })
  })
})
