const Group = require('../lib/group')

describe('API Blueprint generator', () => {
  test('should render a subset of an array if offset/limit is marked', () => {
    const doc = new Group()
    doc.action('Sample Action').is(doc => {
      doc.get('/user')
      doc
        .resBody([{ name: 'user1' }, { name: 'user2' }, { name: 'user3' }])
        .offset(1)
        .limit(1)
    })
    const output = doc.emit()
    expect(output.includes('user1')).toBe(false)
    expect(output.includes('user2')).toBe(true)
    expect(output.includes('user3')).toBe(false)
  })

  test('should render 0, null, undefined, false and empty string correctly', () => {
    const doc = new Group()
    doc.action('Sample Action').is(doc => {
      doc.get('/user')
      doc.resBody(
        [0, null, undefined, false, ''].map(value => {
          return { name: value }
        })
      )
    })
    const output = doc.emit()
    expect(output.includes('+ name: 0 (number')).toBe(true)
    expect(output.match(/\+ name \(object/g).length).toBe(2)
    expect(output.includes('+ name: false (boolean')).toBe(true)
    expect(output).toMatch(/\+ name$/m)
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
          'x-custom-request-header': 'foobar'
        })
        doc.reqHeader('x-another-header', 'test')
        doc.resHeaders({
          'set-cookie': ['foo=bar', 'abc=xyz']
        })
      })
    const output = doc.emit()
    expect(output.includes('x-group-common-header: 123')).toBe(true)
    expect(output.includes('x-custom-request-header: foobar')).toBe(true)
    expect(output.includes('x-another-header: test')).toBe(true)
    expect(output.includes('set-cookie: foo=bar')).toBe(true)
    expect(output.includes('set-cookie: abc=xyz')).toBe(true)
  })

  test('should render response status code', () => {
    const doc = new Group()
    doc.action('Sample Action').is(doc => {
      doc.get('/user')
      doc.status(200)
      doc.anotherExample()
      doc.status(404)
    })
    const output = doc.emit()
    expect(output.includes('Response 200')).toBe(true)
    expect(output.includes('Response 404')).toBe(true)
  })
})
