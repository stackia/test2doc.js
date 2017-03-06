require('should')
const fs = require('fs')

const Group = require('../../lib/group')

suite('group.js', function () {
  suite('#Group', function () {
    ['title', 'desc', 'scheme', 'host', 'basePath'].forEach(methodName => {
      test(`should be able to chain ${methodName}() method`, function () {
        const group = new Group()
        group[methodName].should.be.a.Function()
        group[methodName]('blah', 'blah', 'blah', 'blah')[methodName].should.be.a.Function()
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
