require('should')

const doc = require('../')

describe('Group', function () {
  ['title', 'desc', 'scheme', 'host', 'basePath'].forEach(methodName => {
    it(`should be able to chain ${methodName}() method`, function () {
      doc[methodName].should.be.a.Function()
      doc[methodName]('blah', 'blah', 'blah', 'blah')[methodName].should.be.a.Function()
    })
  })
})
