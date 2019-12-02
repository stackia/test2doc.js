const methods = require('methods')
const { compile } = require('path-to-regexp')

const capture = require('./capture')

class Action {
  constructor(group) {
    this.group = group
    this.docs = {
      method: '',
      title: '',
      descriptions: [],
      url: ''
    }
    this.parameters = []
    this.queries = []
    this.requestHeaders = []
    this.requestBodies = []
    this.responseHeaders = []
    this.statusCodes = []
    this.responseBodies = []
    this.example = 0
    for (const method of methods) {
      this[method] = (url, params) => this.method(method).url(url, params)
    }
  }

  method(method = '') {
    this.docs.method = method.toUpperCase()
    return this
  }

  title(title) {
    this.docs.title = title
    return this
  }

  desc(...descriptions) {
    this.docs.descriptions = descriptions
    return this
  }

  url(url, parameters) {
    this.docs.url = url.startsWith('/') ? url.substr(1) : url
    if (this.docs.url.endsWith('/'))
      this.docs.url = this.docs.url.substr(0, this.docs.url.length - 1)
    if (parameters) {
      url = compile(url)(this.params(parameters))
    }
    return url
  }

  val(value, ...descriptions) {
    return capture(value).desc(...descriptions)
  }

  anotherExample() {
    this.example++
    return this
  }

  params(parameters, returnProxy = false) {
    const captured = capture(parameters)
    this.parameters[this.example] = captured
    return returnProxy ? captured : capture.undo(parameters)
  }

  query(queries, returnProxy = false) {
    const captured = capture(queries)
    this.queries[this.example] = captured
    return returnProxy ? captured : capture.undo(queries)
  }

  reqHeader(name, value, returnProxy = false) {
    if (!this.requestHeaders[this.example])
      this.requestHeaders[this.example] = capture({})
    const captured = capture(value)
    this.requestHeaders[this.example][name] = captured
    return [name, returnProxy ? captured : capture.undo(captured)]
  }

  reqHeaders(headers, returnProxy = false) {
    const captured = capture(headers)
    this.requestHeaders[this.example] = captured
    return returnProxy ? captured : capture.undo(headers)
  }

  reqBody(body, description, returnProxy = false) {
    const captured = capture(body)
    if (description) captured.desc(description)
    this.requestBodies[this.example] = captured
    return returnProxy ? captured : capture.undo(body)
  }

  resHeaders(headers) {
    const captured = capture(headers)
    this.responseHeaders[this.example] = captured
    return captured
  }

  status(statusCode) {
    this.statusCodes[this.example] = statusCode
    return statusCode
  }

  resBody(body) {
    const captured = capture(body)
    this.responseBodies[this.example] = captured
    return captured
  }

  is(collectFn) {
    const collect = collectFn(this)
    return collect instanceof Promise ? collect.then(() => this) : this
  }

  uncapture(object, shouldSliceArray = false) {
    return capture.undo(object, shouldSliceArray)
  }
}

module.exports = Action
