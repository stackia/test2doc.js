require('should')

const Group = require('../lib/group')

describe('API Blueprint generator', function() {
  it('should render a subset of an array if offset/limit is marked', function() {
    const doc = new Group()
    doc.action('Sample Action').is(doc => {
      doc.get('/user')
      doc
        .resBody([{ name: 'user1' }, { name: 'user2' }, { name: 'user3' }])
        .offset(1)
        .limit(1)
    })
    const output = doc.emit()
    output.includes('user1').should.be.false()
    output.includes('user2').should.be.true()
    output.includes('user3').should.be.false()
  })

  it('should render 0, null, undefined, false and empty string correctly', function() {
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
    output.includes('+ name: 0 (number').should.be.true()
    output.match(/\+ name \(object/g).length.should.be.equal(2)
    output.includes('+ name: false (boolean').should.be.true()
    output.should.match(/\+ name$/m)
  })

  it('should render request/response headers', function() {
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
    output.includes('x-group-common-header: 123').should.be.true()
    output.includes('x-custom-request-header: foobar').should.be.true()
    output.includes('x-another-header: test').should.be.true()
    output.includes('set-cookie: foo=bar').should.be.true()
    output.includes('set-cookie: abc=xyz').should.be.true()
  })

  it('should render response status code', function() {
    const doc = new Group()
    doc.action('Sample Action').is(doc => {
      doc.get('/user')
      doc.status(200)
      doc.anotherExample()
      doc.status(404)
    })
    const output = doc.emit()
    output.includes('Response 200').should.be.true()
    output.includes('Response 404').should.be.true()
  })
})
