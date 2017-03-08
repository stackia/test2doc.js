const should = require('should')

const Group = require('../../lib/group')
const capture = require('../../lib/capture')

suite('action.js', function () {
  suite('#Action', function () {
    ['method', 'title', 'desc', 'anotherExample', 'status'].forEach(methodName => {
      test(`should be able to chain ${methodName}() method`, function () {
        const group = new Group()
        const action = group.action('Sample Action')
        action[methodName].should.be.a.Function()
        action[methodName]('blah', 'blah', 'blah', 'blah')[methodName].should.be.a.Function()
      })
    })

    suite('#is()', function () {
      test('should call `collectFn` with itself as the parameter', function () {
        const group = new Group()
        const action = group.action('Sample Action')
        action.is(doc => {
          doc.should.equal(action)
        })
      })

      test('should return itself if `collectFn` is synchronized', function () {
        const group = new Group()
        const action = group.action('Sample Action')
        action.is(doc => {}).should.equal(action)
      })

      test('should return a promise that resolves with itself if `collectFn` returns a promise', function () {
        const group = new Group()
        const action = group.action('Sample Action')
        action.is(doc => new Promise(resolve => resolve())).then(doc => doc.should.equal(action))
      })
    })

    suite('#uncapture()', function () {
      test('should return an uncaptured object for a proxy', function () {
        const group = new Group()
        const action = group.action('Sample Action')
        should(action.uncapture(capture(null))).be.null()
      })
    })
  })
})
