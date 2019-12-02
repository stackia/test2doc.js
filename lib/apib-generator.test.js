const generate = require('./apib-generator')

describe('apib-generator.js', () => {
  describe('#convertPath()', () => {
    test('should convert a path-to-regexp style path with queries to an API Blueprint style url', () => {
      expect(
        generate.convertPath('/user/:userId', { foo: 123, bar: 123 })
      ).toBe('/user/{userId}{?foo,bar}')
    })

    test('should work is `queries` parameter is omitted', () => {
      expect(generate.convertPath('/user/:userId')).toBe('/user/{userId}')
      expect(generate.convertPath('/user/:userId/cards/:cardId')).toBe(
        '/user/{userId}/cards/{cardId}'
      )
    })
  })

  describe('#indent()', () => {
    test('should return an indent string with 4 spaces as 1 indent', () => {
      expect(generate.indent(0)).toBe('')
      expect(generate.indent(1)).toBe('    ')
      expect(generate.indent(2)).toBe('        ')
    })
  })

  describe('#msonEscape()', () => {
    test('should escape "my-variable" to "`my-variable`"', () => {
      expect(generate.msonEscape('my-variable')).toBe('`my-variable`')
    })

    test('should escape "sample" to "`Sample`"', () => {
      expect(generate.msonEscape('sample')).toBe('`sample`')
    })

    test('should escape "my`variable" to "`` my`variable ``"', () => {
      expect(generate.msonEscape('my`variable')).toBe('`` my`variable ``')
    })

    test('should not escape "sampleVariable"', () => {
      expect(generate.msonEscape('sampleVariable')).toBe('sampleVariable')
    })

    test('should work with 0, null, undefined, false and empty string', () => {
      ;[0, null, undefined, false, ''].forEach(value => {
        expect(generate.msonEscape(value)).toBe(String(value))
      })
    })

    test('should truncate multi-line string to one line', () => {
      expect(generate.msonEscape('line1\nline2')).toBe('line1 ...')
    })
  })
})
