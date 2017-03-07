const should = require('should')
const fs = require('fs')

const Group = require('../../lib/group')
const capture = require('../../lib/capture')

suite('group.js', function () {
  suite('#Group', function () {
    ['title', 'desc', 'scheme', 'host', 'version', 'basePath'].forEach(methodName => {
      test(`should be able to chain ${methodName}() method`, function () {
        const group = new Group()
        group[methodName].should.be.a.Function()
        group[methodName]('blah', 'blah', 'blah', 'blah')[methodName].should.be.a.Function()
      })
    })

    suite('#group()', function () {
      test('should reuse an existing child group for a same title', function () {
        const group = new Group()
        const childGroup = group.group('Sample Group')
        group.group('Sample Group').should.equal(childGroup)
      })
    })

    suite('#action()', function () {
      test('should reuse an existing child action for a same title and treat as another example', function () {
        const group = new Group()
        const action = group.action('Sample Action')
        const exampleIndex = action.example
        const anotherAction = group.action('Sample Action')
        anotherAction.should.equal(action)
        anotherAction.example.should.equal(exampleIndex + 1)
      })
    })

    suite('#is()', function () {
      test('should call `collectFn` with itself as the parameter', function () {
        const group = new Group()
        group.is(doc => {
          doc.should.equal(group)
        })
      })

      test('should return itself if `collectFn` is synchronized', function () {
        const group = new Group()
        group.is(doc => {}).should.equal(group)
      })

      test('should return a promise that resolves with itself if `collectFn` returns a promise', function () {
        const group = new Group()
        group.is(doc => new Promise(resolve => resolve())).then(doc => doc.should.equal(group))
      })
    })

    suite('#uncapture()', function () {
      test('should return an uncaptured object for a proxy', function () {
        const group = new Group()
        should(group.uncapture(capture(null))).be.null()
      })
    })

    suite('#emit()', function () {
      test('should return text directly if parameter `file` is omitted', function () {
        const group = new Group()
        group.title('Sample Documentation')
        group.emit().includes('Sample Documentation').should.be.true()
      })

      test('should write to file for a given file path', function () {
        const group = new Group()
        group.emit('sample-for-test.apib')
        fs.unlinkSync('sample-for-test.apib')
      })
    })
  })
})
