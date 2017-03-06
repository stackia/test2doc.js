require('should')

const Group = require('../lib/group')

describe('API Blueprint generator', function () {
  it('should render a subset of an array if offset/limit is marked', function () {
    const doc = new Group()
    doc.action('Sample Action').is(doc => {
      doc.get('/user')
      doc.resBody([{ name: 'user1' }, { name: 'user2' }, { name: 'user3' }]).offset(1).limit(1)
    })
    const output = doc.emit()
    output.includes('user1').should.be.false()
    output.includes('user3').should.be.false()
  })
})
