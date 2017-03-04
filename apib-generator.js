const pathToRegexp = require('path-to-regexp')
const capture = require('./capture')

function convertPath (path, queries) {
  const keys = []
  pathToRegexp(path, keys)
  const parameters = {}
  for (const key of keys) {
    parameters[key.name] = `{${key.name}}`
  }
  path = pathToRegexp.compile(path)(parameters).replace('%7B', '{').replace('%7D', '}')
  if (queries) {
    const keys = Object.keys(queries)
    if (keys.length) path += `{?${keys.join(',')}}`
  }
  return path.startsWith('/') ? path : `/${path}`
}

function indent (level) {
  return '    '.repeat(level)
}

function generateDocForParameters (parameters, indentLevel = 0) {
  let document = `${indent(indentLevel)}+ Parameters\n`
  for (const parameterName of Object.keys(parameters)) {
    const docs = capture.docs(parameters[parameterName])
    const parameterValue = capture.undo(parameters[parameterName])
    document += `${indent(indentLevel + 1)}+ ${parameterName}`
    if (parameterValue !== null && parameterValue !== undefined) {
      document += `: \`${parameterValue}\``
    }
    let additions = []
    let type = docs.possibleValues.length ? capture.typeOf(docs.possibleValues[0]) : capture.typeOf(parameterValue)
    if (type === 'string') type = ''
    if (type) additions.push(type)
    if (docs.required === false) additions.push('optional')
    additions = additions.join(', ')
    if (additions) document += ` (${additions})`
    if (docs.descriptions[0]) document += ` - ${docs.descriptions[0]}`
    document += '\n'
    let details = ''
    details += docs.descriptions.slice(1).map(d => `${indent(indentLevel + 2)}${d}\n\n`).join('')
    if (docs.defaultValue !== undefined) {
      details += `${indent(indentLevel + 2)}+ Default: \`${docs.defaultValue}\`\n\n`
    }
    if (docs.possibleValues.length) {
      details += `${indent(indentLevel + 2)}+ Members\n`
      details += docs.possibleValues.map(v => `${indent(indentLevel + 3)}+ \`${v}\`\n`).join('')
      details += '\n'
    }
    if (details) document += `\n${details}`
  }
  document += '\n'
  return document
}

function msonEscape (text) {
  if (typeof text !== 'string') text = String(text)
  const reservedCharacters = [':', '(', ')', '<', '>', '{', '}', '[', ']', '_', '*', '-', '+', '`']
  const reservedKeywords = ['Property', 'Properties', 'Item', 'Items', 'Member', 'Members', 'Include', 'One of', 'Sample',
    'Trait', 'Traits', 'Parameter', 'Parameters', 'Attribute', 'Attributes', 'Filter', 'Validation', 'Choice', 'Choices', 'Enumeration', 'Enum', 'Object', 'Array', 'Element', 'Elements', 'Description']
  const textToTest = text.toLowerCase()
  const shouldEscape = reservedCharacters.some(character => textToTest.includes(character.toLowerCase())) || reservedKeywords.some(keyword => textToTest === keyword.toLowerCase())
  if (!shouldEscape) return text
  let maxBacktickLength = 0
  for (const match of textToTest.match(/`+/gi) || []) {
    if (match.length > maxBacktickLength) maxBacktickLength = match.length
  }
  const surrounder = '`'.repeat(maxBacktickLength + 1)
  return `${surrounder}${maxBacktickLength > 0 ? ' ' : ''}${text}${maxBacktickLength > 0 ? ' ' : ''}${surrounder}`
}

function objectToMson (object, rootName = '', indentLevel = 0, extraNewline = true, ignoreRootType = false) {
  let document = ''
  capture.traverse(object, node => {
    const docs = capture.docs(node.value)
    const nodeValue = capture.undo(node.value)
    let baseIndent = indentLevel + node.depth
    let parent = node.parent
    while (parent) {
      baseIndent += parent.childenExtraIndent || 0
      parent = parent.parent
    }
    document += indent(baseIndent)
    if (node.depth === 0) {
      document += `+ ${rootName}`
    } else if (node.key) {
      document += `+ ${msonEscape(node.key)}`
    } else {
      document += `+`
      if (node.isLeaf) document += ' '
    }
    if (nodeValue !== null && nodeValue !== undefined) {
      const escapedValue = msonEscape(nodeValue)
      if (node.isLeaf && escapedValue) {
        if (node.key || node.depth === 0 && rootName) document += ': '
        document += escapedValue
      }
    }
    let additions = []
    if (docs.possibleValues.length) {
      additions.push('enum')
    } else {
      let ignoreValueType = false
      if (node.valueType === 'string') ignoreValueType = true
      if (!node.isLeaf && node.valueType === 'object' && (node.key || (node.depth === 0 && rootName))) ignoreValueType = true
      if (node.depth === 0 && ignoreRootType) ignoreValueType = true
      if (!ignoreValueType) additions.push(node.valueType)
    }
    if (docs.required) additions.push('required')
    if (docs.fixed) additions.push('fixed')
    if (docs.fixedType) additions.push('fixed-type')
    if (docs.nullable || nodeValue === null || nodeValue === undefined) additions.push('nullable')
    let sampleEmitted = false
    let defaultEmitted = false
    if (docs.sampleValues.length === 1 && JSON.stringify(docs.sampleValues[0]) === JSON.stringify(nodeValue)) {
      additions.push('sample')
      sampleEmitted = true
    } else if (docs.defaultValue !== undefined && JSON.stringify(docs.defaultValue) === JSON.stringify(nodeValue)) {
      additions.push('default')
      defaultEmitted = true
    }
    additions = additions.join(', ')
    if (additions) document += ` (${additions})`
    if (node.depth > 0 && docs.descriptions[0]) document += ` - ${docs.descriptions[0]}`
    document += '\n'
    let needChildrenHeader = false
    if (node.depth > 0 && docs.descriptions.length > 1) {
      document += '\n'
      document += docs.descriptions.slice(1).map(d => `${indent(baseIndent + 1)}${d}\n\n`).join('')
      needChildrenHeader = true
    }
    if (docs.possibleValues.length) {
      document += objectToMson(docs.possibleValues, 'Members', baseIndent + 1, false, true)
      needChildrenHeader = true
    }
    if (docs.defaultValue && !defaultEmitted) {
      document += objectToMson(docs.defaultValue, 'Default', baseIndent + 1, false, true)
      needChildrenHeader = true
    }
    if (docs.sampleValues.length && !sampleEmitted) {
      document += docs.sampleValues.map(sampleValue => {
        return objectToMson(sampleValue, 'Sample', baseIndent + 1, false, true)
      }).join('')
      needChildrenHeader = true
    }
    if (needChildrenHeader && !node.isLeaf) {
      document += `${indent(baseIndent + 1)}+ `
      if (node.valueType === 'object') {
        document += 'Properties'
      } else if (docs.possibleValues.length) {
        document += 'Sample'
      } else {
        document += 'Items'
      }
      document += '\n'
      node.childenExtraIndent = 1
    }
  })
  if (extraNewline) document += '\n'
  return document
}

function generate (group) {
  const groupStack = [group]
  let document = ''
  while (groupStack.length) {
    const group = groupStack.shift()
    groupStack.unshift(...group.children)

    // Group header & descriptions
    if (group.depth === 0) {
      document += 'FORMAT: 1A9\n'
      if (group.docs.host) {
        document += `HOST: ${group.docs.schemes[0] || 'http'}://${group.docs.host}/${group.docs.basePath}\n`
      }
      document += '\n'
      if (group.docs.title) {
        document += `# ${group.docs.title}\n\n`
      }
    } else {
      const resourceGroup = group.depth === 1 && group.children.length
      if (resourceGroup) {
        document += `# Group ${group.docs.title || 'Untitled'}\n\n`
      } else {
        document += group.depth === 1 ? '# ' : '## '
        const path = convertPath(group.docs.basePath, group.queries)
        if (group.docs.title) {
          document += group.docs.title
          if (group.docs.basePath) document += ` [${path}]`
        } else {
          document += path || 'Untitled Resource'
        }
        document += '\n\n'

        // Resource parameters
        if (group.parameters || group.queries) document += generateDocForParameters(Object.assign({}, group.parameters, group.queries))
      }
    }
    document += group.docs.descriptions.reduce((p, c) => p + c + '\n\n', '')

    // Group actions
    for (const action of group.actions) {
      // Action header & descriptions
      document += action.group.depth === 1 ? '## ' : '### '
      let trimLeft = ''
      let parent = action.group
      while (true) {
        if (parent.docs.basePath) trimLeft = `${parent.docs.basePath}/${trimLeft}`
        if (!parent.parent) break
        parent = parent.parent
      }
      let url = action.docs.url.replace(pathToRegexp(trimLeft, { end: false }), '')
      let actionAllQueries = Object.assign({}, ...action.queries)
      if (url || JSON.stringify(actionAllQueries) !== JSON.stringify(parent.queries || {})) {
        url = action.docs.url.replace(pathToRegexp(parent.docs.basePath, { end: false }), '')
        url = convertPath(url, actionAllQueries)
      }
      if (action.docs.title) {
        document += `${action.docs.title} [${action.docs.method}`
        document += url ? ` ${url}]` : ']'
      } else {
        document += action.docs.method
        if (url) document += ` ${url}`
      }
      document += '\n\n'
      document += action.docs.descriptions.reduce((p, c) => p + c + '\n\n', '')

      const cycle = Math.max(action.parameters.length, action.queries.length, action.requestBodies.length, action.responseBodies.length)
      for (let i = 0; i < cycle; ++i) {
        const hasParameters = action.parameters[i] || action.queries[i]
        // Action parameters
        if (i === 0 && hasParameters) {
          document += generateDocForParameters(Object.assign({}, action.parameters[i], action.queries[i]))
        }

        // Action request
        if (action.requestBodies[i] || (i > 0 && hasParameters)) {
          document += '+ Request'
          const docs = capture.docs(action.requestBodies[i])
          if (docs.descriptions[0]) document += ` ${docs.descriptions[0]}`
          document += ' (application/json)\n\n'
          if (i > 0 && hasParameters) {
            document += generateDocForParameters(Object.assign({}, action.parameters[i], action.queries[i]), 1)
          }
          if (action.requestBodies[i]) {
            document += objectToMson(action.requestBodies[i], 'Attributes', 1)
          }
        }

        // Action response
        if (action.responseBodies[i]) {
          const docs = capture.docs(action.responseBodies[i])
          document += `+ Response ${docs.statusCode || 200} (application/json)\n\n`
          document += objectToMson(action.responseBodies[i], 'Attributes', 1)
        }
      }
    }
  }
  return document
}

module.exports.generate = generate
