const generate = require('./swagger-generator')

describe('swagger-generator.js', () => {
  describe('#convertPath()', () => {
    test('should convert a path-to-regexp style path with queries to a Swagger style url', () => {
      expect(generate.convertPath('/user/:userId')).toBe('/user/{userId}')
      expect(generate.convertPath('/user/:userId/cards/:cardId')).toBe(
        '/user/{userId}/cards/{cardId}'
      )
    })
  })
})
