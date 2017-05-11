require('should')

const generate = require('../../lib/apib-generator')

suite('apib-generator.js', function () {
  suite('#convertPath()', function () {
    test('should convert a path-to-regexp style path with queries to an API Blueprint style url', function () {
      generate.convertPath('/user/:userId', { foo: 123, bar: 123 }).should.equal('/user/{userId}{?foo,bar}')
    })

    test('should work is `queries` parameter is omitted', function () {
      generate.convertPath('/user/:userId').should.equal('/user/{userId}')
      generate.convertPath('/user/:userId/cards/:cardId').should.equal('/user/{userId}/cards/{cardId}')
    })
  })

  suite('#indent()', function () {
    test('should return an indent string with 4 spaces as 1 indent', function () {
      generate.indent(0).should.equal('')
      generate.indent(1).should.equal('    ')
      generate.indent(2).should.equal('        ')
    })
  })

  suite('#msonEscape()', function () {
    test('should escape "my-variable" to "`my-variable`"', function () {
      generate.msonEscape('my-variable').should.equal('`my-variable`')
    })

    test('should escape "sample" to "`Sample`"', function () {
      generate.msonEscape('sample').should.equal('`sample`')
    })

    test('should escape "my`variable" to "`` my`variable ``"', function () {
      generate.msonEscape('my`variable').should.equal('`` my`variable ``')
    })

    test('should not escape "sampleVariable"', function () {
      generate.msonEscape('sampleVariable').should.equal('sampleVariable')
    })

    test('should work with 0, null, undefined, false and empty string', function () {
      [0, null, undefined, false, ''].forEach(value => {
        generate.msonEscape(value).should.equal(String(value))
      })
    })

    test('should truncate multi-line string to one line', function () {
      generate.msonEscape('line1\nline2').should.equal('line1 ...')
    })
  })
})
