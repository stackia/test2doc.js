require('should')

const Group = require('../lib/group')

describe('Swagger specification generator', function () {
  it('should render a subset of an array if offset/limit is marked', function () {
    const doc = new Group()
    doc.action('Sample Action').is(doc => {
      doc.get('/user')
      doc.resBody([{ name: 'user1' }, { name: 'user2' }, { name: 'user3' }]).offset(1).limit(1)
    })
    const output = doc.emit(null, 'swagger')
    output.includes('user1').should.be.false()
    output.includes('user2').should.be.true()
    output.includes('user3').should.be.false()
  })

  it('should render request/response headers', function () {
    const doc = new Group()
    doc.reqHeaders({
      'x-group-common-header': '123'
    }).action('Sample Action').is(doc => {
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
    output.includes('x-group-common-header').should.be.true()
    output.includes('x-custom-request-header').should.be.true()
    output.should.match(/type: array\s+items:\s+type: string\s+name: x-array-header/)
    output.includes('x-another-header').should.be.true()
    output.should.match(/set-cookie:\s+type: array/)
  })

  it('should render response status code', function () {
    const doc = new Group()
    doc.action('Sample Action').is(doc => {
      doc.get('/user')
      doc.status(200)
      doc.anotherExample()
      doc.status(404)
    })
    const output = doc.emit(null, 'swagger')
    output.should.match(/'200':/)
    output.should.match(/'404':/)
  })
})
