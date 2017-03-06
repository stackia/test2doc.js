const fs = require('fs')

const Action = require('./action')
const capture = require('./capture')
const apibGenerator = require('./apib-generator')

class Group {
  constructor (parent) {
    this.depth = parent ? parent.depth + 1 : 0
    this.children = []
    this.parent = parent
    this.actions = []
    this.docs = {
      title: '',
      descriptions: [],
      schemes: [],
      host: '',
      basePath: ''
    }
  }
  title (title) {
    this.docs.title = title
    return this
  }
  desc (...descriptions) {
    this.docs.descriptions = descriptions
    return this
  }
  scheme (...schemes) {
    this.docs.schemes = schemes
    return this
  }
  host (host) {
    this.docs.host = host
    return this
  }
  basePath (basePath, parameters) {
    if (basePath.startsWith('/')) basePath = basePath.substr(1)
    if (basePath.endsWith('/')) basePath = basePath.substr(0, basePath.length - 1)
    this.docs.basePath = basePath
    if (parameters) {
      this.params(parameters)
    }
    return this
  }
  val (value, ...descriptions) {
    return capture(value).desc(...descriptions)
  }
  params (parameters, returnProxy = false) {
    this.parameters = capture(parameters)
    return returnProxy ? this.parameters : capture.undo(parameters)
  }
  query (queries, returnProxy = false) {
    this.queries = capture(queries)
    return returnProxy ? this.queries : capture.undo(queries)
  }
  group (title) {
    let groupIndex = this.children.findIndex(g => g.title === title)
    if (groupIndex >= 0) return this.children[groupIndex]
    const group = new Group(this).title(title)
    this.children.push(group)
    return group
  }
  action (title) {
    const action = new Action(this).title(title)
    this.actions.push(action)
    return action
  }
  is (collectFn) {
    const collect = collectFn(this)
    return collect instanceof Promise ? collect.then(() => this) : this
  }
  uncapture (object) {
    return capture.undo(object)
  }
  emit (file, generator = apibGenerator, options = {}) {
    const documentText = generator.generate(this, options)
    if (!file) return documentText
    fs.writeFileSync(file, documentText)
  }
}

module.exports = Group
