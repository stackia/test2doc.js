const index = require('./index')
const Group = require('./group')

describe('index.js', () => {
  describe('#module.exports', () => {
    test('should be an instasce of Group', () => {
      expect(index).toBeInstanceOf(Group)
    })

    test('should be the root group', () => {
      expect(index.parent).toBeFalsy()
    })
  })
})
