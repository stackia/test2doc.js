/* eslint-disable no-shadow */
const path = require('path')
const request = require('supertest')

const doc = require('../../..')

doc
  .title('JSONPlaceholder API Documentation')
  .version('1.0.0')
  .desc(
    '[JSONPlaceholder](https://jsonplaceholder.typicode.com/) API documentation generated by [test2doc.js](https://github.com/stackia/test2doc.js).'
  )
  .scheme('https', 'http')
  .host('jsonplaceholder.typicode.com')

afterAll(() => {
  doc.emit(path.join(__dirname, 'jsonplaceholder.apib'), 'apib')
  doc.emit(path.join(__dirname, 'jsonplaceholder.yaml'), 'swagger')
})

const base = 'https://jsonplaceholder.typicode.com'

describe('Post', () => {
  doc
    .group('Post')
    .basePath('/posts')
    .desc('APIs related with posts')
    .is((doc) => {
      test('GET /posts to get a list of all posts', async () => {
        await doc.action('Get a list of all posts').is(async (doc) => {
          let res = await request(base).get(doc.get('/posts')).expect(200)
          let body = doc.resBody(res.body)
          expect(
            body.desc('List of all posts').limit(1).uncapture()
          ).toHaveLength(100)
          expect(
            typeof body[0].userId.desc('User id of the post').uncapture()
          ).toBe('number')
          expect(typeof body[0].title.desc('Post title').uncapture()).toBe(
            'string'
          )
          expect(typeof body[0].body.desc('Post content').uncapture()).toBe(
            'string'
          )

          doc.anotherExample()

          res = await request(base)
            .get(doc.get('/posts'))
            .query(
              doc.query({
                userId: doc.val(2, 'Filter the post list by this user ID'),
              })
            )
            .expect(200)
          body = doc.resBody(res.body)
          expect(
            body
              .desc('List of all posts for a specific user')
              .limit(1)
              .uncapture()
          ).toHaveLength(10)
          expect(body[0].userId.desc('User id of the post').uncapture()).toBe(2)
        })
      })

      test('GET /posts/:id to get details of a post', async () => {
        await doc.action('Get details of a post').is(async (doc) => {
          const res = await request(base)
            .get(doc.get('/posts/:id', { id: doc.val(1, 'Post ID') }))
            .expect(200)
          const body = doc.resBody(res.body)
          expect(
            typeof body.userId.desc('User id of the post').uncapture()
          ).toBe('number')
          expect(typeof body.title.desc('Post title').uncapture()).toBe(
            'string'
          )
          expect(typeof body.body.desc('Post content').uncapture()).toBe(
            'string'
          )
        })
      })
    })
})
