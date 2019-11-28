const path = require('path')
const request = require('supertest')
require('should')

const doc = require('../../')

doc.title('V2EX 非官方 API 列表')
  .version('1.0.0')
  .desc('V2EX 非官方 API 列表，仅供参考，欢迎补充。',
    '接口来源：https://github.com/djyde/V2EX-API')
  .scheme('https', 'http')
  .host('www.v2ex.com')
  .basePath('/api')

after(function () {
  doc.emit(path.join(__dirname, 'v2ex.apib'), 'apib')
  doc.emit(path.join(__dirname, 'v2ex.yaml'), 'swagger')
})

const base = 'https://www.v2ex.com'

describe('Site', function () {
  doc.group('Site').basePath('/site').desc('网站相关接口').is(doc => {
    it('should provide /api/site/info.json', async function () {
      await doc.action('获取网站信息').is(async doc => {
        const res = await request(base)
          .get(doc.get('/api/site/info.json'))
          .expect(200)
        const body = doc.resBody(res.body)
        body.title.desc('站名').should.equal('V2EX')
        body.slogan.desc('口号').should.be.a.String()
        body.description.desc('网站描述').should.be.a.String()
        body.domain.desc('网站域名').should.be.a.String()
      })
    })

    it('should provide /api/site/stats.json', async function () {
      await doc.action('获取网站状态').is(async doc => {
        const res = await request(base)
          .get(doc.get('/api/site/stats.json'))
          .expect(200)
        const body = doc.resBody(res.body)
        body.topic_max.desc('主题数量').should.be.a.Number()
        body.member_max.desc('用户数量').should.be.a.Number()
      })
    })

    it('should not provide /api/site/livid.json', async function () {
      await doc.action('获取 Livid 个人资料').desc('这是一个不存在的接口，用来测试 404。').is(async doc => {
        await request(base)
          .get(doc.get('/api/site/livid.json'))
          .expect(doc.status(404))
      })
    })
  })
})

describe('Node', function () {
  doc.group('Node').basePath('/nodes').desc('节点相关接口').is(doc => {
    it('should provide /api/nodes/all.json', async function () {
      await doc.action('获取所有节点列表').is(async doc => {
        const res = await request(base)
          .get(doc.get('/api/nodes/all.json'))
          .expect(200)
        const body = doc.resBody(res.body)
        body.limit(2).should.be.an.Array()
        body[0].name.desc('节点名称').should.be.a.String()
        body[0].topics.should.be.a.Number()
      })
    })

    it('should provide /api/nodes/show.json', async function () {
      await doc.action('获取指定节点信息').desc('节点 ID 和节点名两个参数二选一。').is(async doc => {
        let res = await request(base)
          .get(doc.get('/api/nodes/show.json'))
          .query(doc.query({ id: doc.val(2, '节点 ID') }))
          .expect(200)
        let body = doc.resBody(res.body)
        body.desc('节点信息').name.should.be.a.String()

        doc.anotherExample()

        res = await request(base)
          .get(doc.get('/api/nodes/show.json'))
          .query(doc.query({ name: doc.val('stackia', '节点名') }))
          .expect(200)
        body = doc.resBody(res.body)
        body.status.should.equal('error')
        body.rate_limit.desc('API 访问次数限制相关信息')
      })
    })
  })
})

describe('Topic', function () {
  doc.group('Topic').basePath('/topics').desc('主题相关接口').is(doc => {
    it('should provide /api/topics/latest.json', async function () {
      await doc.action('获取最新主题列表').is(async doc => {
        const res = await request(base)
          .get(doc.get('/api/topics/latest.json'))
          .expect(200)
        const body = doc.resBody(res.body)
        body.limit(1).should.be.an.Array()
        body[0].member.desc('发帖人信息')
      })
    })

    it('should provide /api/topics/hot.json', async function () {
      await doc.action('获取热门主题列表').is(async doc => {
        const res = await request(base)
          .get(doc.get('/api/topics/hot.json'))
          .expect(200)
        const body = doc.resBody(res.body)
        body.limit(1).should.be.an.Array()
      })
    })

    it('should provide /api/topics/show.json', async function () {
      await doc.action('获取指定主题信息').desc('参数四选一。').is(async doc => {
        let res = await request(base)
          .get(doc.get('/api/topics/show.json'))
          .query(doc.query({ id: doc.val(1000) }))
          .expect(200)
        let body = doc.resBody(res.body)
        body.limit(1).should.be.an.Array()
        body[0].created.desc('主题创建时间戳').should.be.a.Number()

        doc.anotherExample()

        res = await request(base)
          .get(doc.get('/api/topics/show.json'))
          .query(doc.query({
            username: doc.val('Livid', '根据用户名取该用户所发表主题').nullable(),
            node_id: doc.val(null, '根据节点 ID 取该节点下所有主题'),
            node_name: doc.val(null, '根据节点名取该节点下所有主题')
          }))
          .expect(200)
        body = doc.resBody(res.body)
        body.offset(1).limit(1).should.be.an.Array()
      })
    })
  })
})

describe('Replies', function () {
  doc.group('Replies').basePath('/replies').desc('主题回复相关接口').is(doc => {
    it('should provide /api/replies/show.json', async function () {
      await doc.action('获取指定主题的所有回复列表').is(async doc => {
        const res = await request(base)
          .get(doc.get('/api/replies/show.json'))
          .query(doc.query({
            topic_id: doc.val(1).required(),
            page: doc.val(1, '当前页数'),
            page_size: doc.val(20, '每页条数')
          }))
          .expect(200)
        const body = doc.resBody(res.body)
        body.limit(1).should.be.an.Array()
        body[0].last_modified.desc('最后编辑时间戳').should.be.a.Number()
      })
    })
  })
})

describe('Members', function () {
  doc.group('Members').basePath('/members').desc('用户相关接口').is(doc => {
    it('should provide /api/members/show.json', async function () {
      await doc.action('获取指定主题的所有回复列表').is(async doc => {
        const res = await request(base)
          .get(doc.get('/api/members/show.json'))
          .query(doc.query({ username: doc.val('Livid').required() }))
          .expect(200)
        const body = doc.resBody(res.body)
        body.avatar_normal.desc('头像 URL').should.match(/^(https?:)?\/\//)
      })
    })
  })
})
