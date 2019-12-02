const fs = require('fs')

const Group = require('./group')
const capture = require('./capture')

describe('group.js', () => {
  describe('#Group', () => {
    ;[
      'title',
      'desc',
      'scheme',
      'host',
      'version',
      'basePath',
      'params',
      'query',
      'reqHeaders'
    ].forEach(methodName => {
      test(`should be able to chain ${methodName}() method`, () => {
        const group = new Group()
        expect(group[methodName]).toBeInstanceOf(Function)
        expect(
          group[methodName]('blah', 'blah', 'blah', 'blah')[methodName]
        ).toBeInstanceOf(Function)
      })
    })

    describe('#group()', () => {
      test('should reuse an existing child group for a same title', () => {
        const group = new Group()
        const childGroup = group.group('Sample Group')
        expect(group.group('Sample Group')).toBe(childGroup)
      })
    })

    describe('#action()', () => {
      test('should reuse an existing child action for a same title and treat as another example', () => {
        const group = new Group()
        const action = group.action('Sample Action')
        const exampleIndex = action.example
        const anotherAction = group.action('Sample Action')
        expect(anotherAction).toBe(action)
        expect(anotherAction.example).toBe(exampleIndex + 1)
      })
    })

    describe('#is()', () => {
      test('should call `collectFn` with itself as the parameter', () => {
        const group = new Group()
        group.is(doc => {
          expect(doc).toBe(group)
        })
      })

      test('should return itself if `collectFn` is synchronized', () => {
        const group = new Group()
        expect(group.is(doc => {})).toBe(group)
      })

      test('should return a promise that resolves with itself if `collectFn` returns a promise', () => {
        const group = new Group()
        group
          .is(doc => new Promise(resolve => resolve()))
          .then(doc => expect(doc).toBe(group))
      })
    })

    describe('#uncapture()', () => {
      test('should return an uncaptured object for a proxy', () => {
        const group = new Group()
        expect(group.uncapture(capture(null))).toBeNull()
      })
    })

    describe('#emit()', () => {
      test('should return text directly if parameter `file` is omitted', () => {
        const group = new Group()
        group.title('Sample Documentation')
        expect(group.emit().includes('Sample Documentation')).toBe(true)
      })

      test('should write to file for a given file path', () => {
        const group = new Group()
        group.emit('sample-for-test.apib')
        fs.unlinkSync('sample-for-test.apib')
      })
    })
  })
})
