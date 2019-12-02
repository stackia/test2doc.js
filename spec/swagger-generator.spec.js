const Group = require('../lib/group')

describe('Swagger specification generator', () => {
  test('should render a subset of an array if offset/limit is marked', () => {
    const doc = new Group()
    doc.action('Sample Action').is(doc => {
      doc.get('/user')
      doc
        .resBody([{ name: 'user1' }, { name: 'user2' }, { name: 'user3' }])
        .offset(1)
        .limit(1)
    })
    const output = doc.emit(null, 'swagger')
    expect(output.includes('user1')).toBe(false)
    expect(output.includes('user2')).toBe(true)
    expect(output.includes('user3')).toBe(false)
  })

  test('should render request/response headers', () => {
    const doc = new Group()
    doc
      .reqHeaders({
        'x-group-common-header': '123'
      })
      .action('Sample Action')
      .is(doc => {
        doc.get('/user')
        doc.reqHeaders({
          'x-custom-request-header': 'foobar',
          'x-array-header': ['value1', 'value2']
        })
        doc.reqHeader('x-another-header', 'test')
        doc.resHeaders({
          'set-cookie': ['foo=bar', 'abc=xyz']
        })
      })
    const output = doc.emit(null, 'swagger')
    expect(output.includes('x-group-common-header')).toBe(true)
    expect(output.includes('x-custom-request-header')).toBe(true)
    expect(output).toMatch(
      /type: array\s+items:\s+type: string\s+name: x-array-header/
    )
    expect(output.includes('x-another-header')).toBe(true)
    expect(output).toMatch(/set-cookie:\s+type: array/)
  })

  test('should render response status code', () => {
    const doc = new Group()
    doc.action('Sample Action').is(doc => {
      doc.get('/user')
      doc.status(200)
      doc.anotherExample()
      doc.status(404)
    })
    const output = doc.emit(null, 'swagger')
    expect(output).toMatch(/'200':/)
    expect(output).toMatch(/'404':/)
  })
})
