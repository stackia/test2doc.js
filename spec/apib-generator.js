require('should')

const Group = require('../lib/group')
const capture = require('../lib/capture')

describe('API Blueprint generator', function () {
  it('should render a subset of an array if offset/limit is marked', function () {
    const doc = new Group()
    doc.action('Sample Action').is(doc => {
      doc.get('/user')
      doc.resBody([{ name: 'user1' }, { name: 'user2' }, { name: 'user3' }]).offset(1).limit(1)
    })
    const output = doc.emit()
    output.includes('user1').should.be.false()
    output.includes('user2').should.be.true()
    output.includes('user3').should.be.false()
  })

  it('should render 0, null, undefined, false and empty string correctly', function () {
    capture.isWrapperType.should.be.a.Function()
    const doc = new Group()
    doc.action('Sample Action').is(doc => {
      doc.get('/user')
      doc.resBody([0, null, undefined, false, ''].map(value => {
        return { name: value }
      }))
    })
    const output = doc.emit()
    output.includes('+ name: 0 (number').should.be.true()
    output.match(/\+ name \(object/g).length.should.be.equal(2)
    output.includes('+ name: false (boolean').should.be.true()
    output.should.match(/\+ name$/m)
  })
})
