const fs = require('fs')

const Action = require('./action')
const capture = require('./capture')

class Group {
  constructor(parent) {
    this.depth = parent ? parent.depth + 1 : 0
    this.children = []
    this.parent = parent
    this.actions = []
    this.docs = {
      title: '',
      descriptions: [],
      schemes: [],
      host: '',
      basePath: '',
      version: ''
    }
  }

  title(title) {
    this.docs.title = title
    return this
  }

  desc(...descriptions) {
    this.docs.descriptions = descriptions
    return this
  }

  scheme(...schemes) {
    this.docs.schemes = schemes
    return this
  }

  host(host) {
    this.docs.host = host
    return this
  }

  version(version) {
    this.docs.version = version
    return this
  }

  basePath(basePath, parameters) {
    if (basePath.startsWith('/')) basePath = basePath.substr(1)
    if (basePath.endsWith('/'))
      basePath = basePath.substr(0, basePath.length - 1)
    this.docs.basePath = basePath
    if (parameters) {
      this.params(parameters)
    }
    return this
  }

  val(value, ...descriptions) {
    return capture(value).desc(...descriptions)
  }

  params(parameters) {
    this.parameters = capture(parameters)
    return this
  }

  query(queries) {
    this.queries = capture(queries)
    return this
  }

  reqHeaders(headers) {
    this.requestHeaders = capture(headers)
    return this
  }

  group(title) {
    const groupIndex = this.children.findIndex(g => g.docs.title === title)
    if (groupIndex >= 0) return this.children[groupIndex]
    const group = new Group(this).title(title)
    this.children.push(group)
    return group
  }

  action(title) {
    const actionIndex = this.actions.findIndex(a => a.docs.title === title)
    if (actionIndex >= 0) {
      this.actions[actionIndex].anotherExample()
      return this.actions[actionIndex]
    }
    const action = new Action(this).title(title)
    this.actions.push(action)
    return action
  }

  is(collectFn) {
    const collect = collectFn(this)
    return collect instanceof Promise ? collect.then(() => this) : this
  }

  uncapture(object, shouldSliceArray = false) {
    return capture.undo(object, shouldSliceArray)
  }

  emit(file, generator = 'apib', options = {}) {
    const generateFn =
      typeof generator === 'string'
        ? require(`./${generator}-generator`).generate
        : generator
    const documentText = generateFn(this, options)
    if (!file) return documentText
    fs.writeFileSync(file, documentText)
  }
}

module.exports = Group
