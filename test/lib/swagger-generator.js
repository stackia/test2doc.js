require('should')

const generate = require('../../lib/swagger-generator')

suite('swagger-generator.js', function () {
  suite('#convertPath()', function () {
    test('should convert a path-to-regexp style path with queries to a Swagger style url', function () {
      generate.convertPath('/user/:userId').should.equal('/user/{userId}')
    })
  })
})
