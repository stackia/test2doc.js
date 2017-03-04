const should = require('should')

const index = require('../')
const Group = require('../lib/group')

suite('index.js', function () {
  suite('#module.exports', function () {
    test('should be an instasce of Group', function () {
      index.should.be.an.instanceOf(Group)
    })

    test('should be the root group', function () {
      should(index.parent).not.be.ok()
    })
  })
})
