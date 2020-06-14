# test2doc.js - Build API docs from your tests

[![npm](https://img.shields.io/npm/l/test2doc.svg)](https://www.npmjs.com/package/test2doc) [![npm](https://img.shields.io/npm/v/test2doc.svg)](https://www.npmjs.com/package/test2doc) [![Travis CI](https://travis-ci.org/stackia/test2doc.js.svg?branch=master)](https://travis-ci.org/stackia/test2doc.js) [![Coverage Status](https://coveralls.io/repos/github/stackia/test2doc.js/badge.svg)](https://coveralls.io/github/stackia/test2doc.js) [![Dependabot Status](https://api.dependabot.com/badges/status?host=github&repo=stackia/test2doc.js)](https://dependabot.com)

test2doc.js helps you seamlessly integrate API documentation generation to your test flow.

You write something like this:

```javascript
const doc = require('test2doc')
const request = require('supertest') // We use supertest as the HTTP request library
require('should') // and use should as the assertion library

// For Koa, you should exports app.listen() or app.callback() in your app entry
const app = require('./my-express-app.js')

after(function () {
  doc.emit('api-documentation.apib') // Or doc.emit('api-documentation.yaml', 'swagger') if you like Swagger
})

doc.group('Products').is((doc) => {
  describe('#Products', function () {
    doc.action('Get all products').is((doc) => {
      it('should get all products', function () {
        // Write specs towards your API endpoint as you would normally do
        // Just decorate with some utility methods
        return request(app)
          .get(doc.get('/products'))
          .query(
            doc.query({
              minPrice: doc
                .val(
                  10,
                  'Only products of which price >= this value should be returned'
                )
                .required(),
            })
          )
          .expect(200)
          .then((res) => {
            doc.resHeaders(res.headers)
            body = doc.resBody(res.body)
            body.desc('List of all products').should.not.be.empty()
            body[0].should.have.properties('id', 'name', 'price')
            body[0].price.desc('Price of this product').should.be.a.Number()
          })
      })
    })
  })
})
```

And then test2doc.js will capture all the info provided by you via `doc.get` / `doc.query` / `doc.resBody` / `myVar.desc`. You can choose a generator to generate the final documents based on these collected information. Since we capture every thing we need from tests, you will always get up-to-date documents.

Currently we provide [**API Blueprint**](https://apiblueprint.org/) generator and [**Swagger**](http://swagger.io/) generator.

test2doc.js is not designed to run on a specified test framework, which means you can use this in conjunction with any test frameworks and assertion libraries.

We provide an extension for supertest called [supertest-test2doc](https://github.com/stackia/supertest-test2doc), which makes it much easier to integrate test2doc.js with [supertest](https://github.com/visionmedia/supertest).

## Installation

Install test2doc.js as an npm module and save it to your package.json file as a development dependency:

```
npm install test2doc --save-dev
```

Once installed it can now be referenced by simply calling `require('test2doc')`.

_The npm package name is `test2doc` without `.js` suffix._

## Getting Started

First require this library, for convenience we use `doc` as the imported variable name:

```javascript
const doc = require('test2doc')
```

test2doc.js has two core concepts: `group` and `action`. A `group` is a collection of `action`s and child `group`s, and an `action` describes a real API endpoint (HTTP method / url / queries / request body / response body / headers). Like a tree, `action`s are leaf nodes and `group`s are non-leaf nodes.

The `doc` variable imported here is the root `group`. When you call `doc.group('Name of this subgroup')`, it returns a new object represents the sub `group`, which has exactly the same interfaces as the root `group`.

When you call `doc.action('Name of this action')`, it returns a new object represents the `action`, which has different interfaces compared to `group`.

For convenience, we usually use the variable name `doc` all the way to make it easy to write clean codes.

Some methods of `group` object are:

- `doc.title(title)` - set title of this group
- `doc.desc(...descriptions)` - give descriptions for this group
- `doc.basePath(basePath)` - set base path for this group
- `doc.group(childGroupTitle)` - create a child group, returns the child group

Some methods of `action` object are:

- `doc.get(url, parameters)` - Capture a string as the url, returns this url so you call pass to your HTTP request library
- `doc.resBody(body)` - Capture an object as the response body, returns an proxy of this object

_Full list can be found at [API references](#api-references) section._

Methods like `doc.resBody(body)` / `doc.val(value, ...descriptions)` and so on returns an [ES6 Proxy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy) of the object passed in. So we can add custom methods to these objects like `desc(...descriptions)`, `required()`, etc. However because JS doesn't allow proxying non-object value (number / null / undefined etc.), we will create wrapper objects around these values. If these wrapper objects don't work well with your assertion / request library, you can use `doc.uncapture(object)` to get the original value.

Once you have collected all the info needed to build the documentations, call `emit` on the root group to emit the actual documentation file. Generally you will do this in a global `after` hook.

## API references

### Group

#### Methods

- `title (title)` - set title of this group
  - return: this group
- `desc (...descriptions)` - give descriptions for this group
  - A group can have multiple descriptions. Generally each description will be rendered as a paragraph.
  - return: this group
- `scheme (...schemes)` - set supported schemes on this group
  - e.g. `scheme('http', 'https', 'ws', 'wss')`
  - return: this group
- `host (host)` - set hostname for this group
  - Only hostname, without 'http://' or trailing slash.
  - return: this group
- `version (version)` - set API version for this group
  - return: this group
- `basePath (basePath, parameters)` - set base path for this group
  - e.g. `basePath('/v0/product/:id', { id: doc.val('123', 'Product ID') })`
  - return: this group
- `val (value, ...descriptions)` - capture an value and give it descriptions
  - return: a proxy of `value`
- `params (parameters)` - describe parameters for the base path
  - Same as the second parameter in `basePath(basePath, parameters)`
  - return: this group
- `query (queries)` - describe queries for the base path
  - return: this group
- `reqHeaders (headers)` - describe common request headers for all actions in this group
  - e.g. `doc.reqHeaders({ 'x-my-header': 'foobar', 'x-my-array-header': ['value1', 'value2'] })`
  - return: this group
- `group (title)` - create a child group titled `title`
  - return: the newly created child group
- `action (title)` - create an action titled `title` belonging to this group
  - return: the newly created action
- `is (collectFn)` - call `collectFn` with this group as the first argument
  - Usually used in chaining call.
  - e.g. `doc.group('a child group').is(doc => { ... })`, first `doc` refers to the parent group, second `doc` refers to the child group
  - return: this group, or a promise if `collectFn` returns a promise, which will be resolved with this group when the promise returned by `collectFn` finishes.
- `uncapture (object, shouldSliceArray = false)` - uncapture an object (strip the proxy)
  - If `shouldSliceArray` is true, then any array in `object` will be subsetted according to offset() and limit() set on it.
  - return: an uncaptured object, with all its children and nested children uncaptured
- `emit (file, generator = 'apib', options = {})` - generate the actual documentation file
  - `file` can be a filename or a file descriptor. It's the same object passed into `fs.writeFileSync`.
  - If `file` is omitted, the generated text will be the return value.
  - Available generators: `apib` / `swagger`
  - return: void

### Action

#### Methods

- `get/post/put/delete/...(url, parameters)` - shortcut of `method(method).url(url, parameters)`
  - Supports all methods provided by npm package [methods](https://www.npmjs.com/package/methods).
  - return: the url with parameters filled in
- `method (method)` - set request method of this action
  - return: this action
- `title (title)` - set title of this action
  - return: this action
- `desc (...descriptions)` - give descriptions for this action
  - return: this action
- `url (url, parameters)` - describe url and url parameters for this action
  - `url` can be [an express-route-style path](https://expressjs.com/en/guide/routing.html#route-paths), which can include parameters
  - use `parameters` to describe parameters in the url
  - return: the url with parameters filled in
- `val (value, ...descriptions)` - Same as `group`.`val`
- `anotherExample ()` - as a seperator between different exapmles
  - an example = params + query + reqBody + resBody
  - return: this action
  - e.g.

```
doc.params ...blahblah... doc.query ...blahblah... doc.reqBody ...blahblah... doc.resBody
doc.anotherExample() // Divide into two examples in a same code block
doc.params ...blahblah... doc.query ...blahblah... doc.reqBody ...blahblah... doc.resBody
```

- `params (parameters, returnProxy = false)` - Same as `group`.`params`, except this is for action
- `query (queries, returnProxy = false)` - Same as `group`.`query`, except this is for action
- `reqHeader (name, value, returnProxy = false)` - describe a single header for this action
  - e.g. `doc.reqHeader('authorization', 'Bearer 123456')` returns `['authorization', 'Bearer 123456']`
  - return: an array with two items, `name` and `value`
- `reqHeaders (headers, returnProxy = false)` - describe request headers for this action
  - e.g. `doc.reqHeaders({ 'x-my-header': 'foobar', 'x-my-array-header': ['value1', 'value2'] })`
  - return: the `headers` object passed in, or a proxy of `headers` if `returnProxy` is true
- `reqBody (body, description, returnProxy = false)` - Capture an object as the request body and give it a description
  - return: the `body` object passed in, or a proxy of `body` if `returnProxy` is true
- `resHeaders (headers)` - describe response headers for this action
  - e.g. `doc.resHeaders({ 'content-type': 'application-json', 'x-total-page': '16' })`
  - return: a proxy of `headers`
- `status (statusCode)` - describe the response HTTP status code for this action
  - return: the `statusCode` passed in
- `resBody (body)` - Capture an object as the response body
  - return: a proxy of `body`
- `is (collectFn)` - Same as `group`.`is`, except the parameter passed to `collectFn` is this action
- `uncapture (object)` - Same as `group`.`uncapture`

### Captured Objects

#### Methods

- `desc (...descriptions)` - give descriptions for this object
  - return: this captured object
- `required ()` - mark this as required
  - return: this captured object
- `optional ()` - mark this as optional (opposite to `required()`)
  - return: this captured object
- `nullable (nullable = true)` - mark this as nullable or non-nullable
  - return: this captured object
- `fixed (fixed = true)` - mark this as [fixed](https://apiblueprint.org/documentation/mson/specification.html#353-type-attribute)
  - return: this captured object
- `fixedType (fixedType = true)` - mark this as [fixed-type](https://apiblueprint.org/documentation/mson/specification.html#353-type-attribute)
  - return: this captured object
- `enum (...possibleValues)` - mark this should be a member of `possibleValues`
  - return: this captured object
- `default (defaultValue)` - mark the default value for this
  - return: this captured object
- `sample (...sampleValues)` - give a sample value for this
  - return: this captured object
- `offset (offset)` - specify the offset in the array to be included in the documents
  - Only makes sense if this is an array
  - Useful if you only want to include a subset of this array in the documents
  - return: this captured object
- `limit (limit)` - specify the number of items from the offset in the array to be included in the documents
  - Only makes sense if this is an array
  - Useful if you only want to include a subset of this array in the documents
  - return: this captured object
- `uncapture (shouldSliceArray = false)` - uncapture this
  - If `shouldSliceArray` is true, then any array in this object will be subsetted according to offset() and limit() set on it.
  - return: the uncaptured original object for this

## Roadmap

- [x] Add tests and integrate with Travis CI
- [x] Swagger support
- [x] Write [an extension for supertest](https://github.com/stackia/supertest-test2doc) to simplify grammer
- [ ] Incremental document generation
- [ ] CONTRIBUTION guide
- [ ] An official website

## License

The project is released under [MIT License](https://github.com/stackia/test2doc.js/blob/master/LICENSE).
