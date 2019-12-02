const Group = require('./group')
const capture = require('./capture')

describe('action.js', () => {
  describe('#Action', () => {
    ;['method', 'title', 'desc', 'anotherExample'].forEach(methodName => {
      test(`should be able to chain ${methodName}() method`, () => {
        const group = new Group()
        const action = group.action('Sample Action')
        expect(action[methodName]).toBeInstanceOf(Function)
        expect(
          action[methodName]('blah', 'blah', 'blah', 'blah')[methodName]
        ).toBeInstanceOf(Function)
      })
    })

    describe('#is()', () => {
      test('should call `collectFn` with itself as the parameter', () => {
        const group = new Group()
        const action = group.action('Sample Action')
        action.is(doc => {
          expect(doc).toBe(action)
        })
      })

      test('should return itself if `collectFn` is synchronized', () => {
        const group = new Group()
        const action = group.action('Sample Action')
        expect(action.is(doc => {})).toBe(action)
      })

      test('should return a promise that resolves with itself if `collectFn` returns a promise', () => {
        const group = new Group()
        const action = group.action('Sample Action')
        action
          .is(doc => new Promise(resolve => resolve()))
          .then(doc => expect(doc).toBe(action))
      })
    })

    describe('#uncapture()', () => {
      test('should return an uncaptured object for a proxy', () => {
        const group = new Group()
        const action = group.action('Sample Action')
        expect(action.uncapture(capture(null))).toBeNull()
      })
    })
  })
})
