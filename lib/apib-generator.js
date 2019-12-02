const { pathToRegexp, compile } = require('path-to-regexp')

const capture = require('./capture')

function convertPath(path, queries) {
  const keys = []
  pathToRegexp(path, keys)
  const parameters = {}
  for (const key of keys) {
    parameters[key.name] = `{${key.name}}`
  }
  path = compile(path)(parameters)
    .replace(/%7B/g, '{')
    .replace(/%7D/g, '}')
  if (queries) {
    const keys = Object.keys(queries)
    if (keys.length) path += `{?${keys.join(',')}}`
  }
  return path.startsWith('/') ? path : `/${path}`
}

function indent(level) {
  return '    '.repeat(level)
}

function generateDocForParameters(parameters, indentLevel = 0) {
  let document = `${indent(indentLevel)}+ Parameters\n`
  for (const parameterName of Object.keys(parameters)) {
    const docs = capture.docs(parameters[parameterName])
    const parameterValue = capture.undo(parameters[parameterName])
    document += `${indent(indentLevel + 1)}+ ${parameterName}`
    if (parameterValue !== null && parameterValue !== undefined) {
      document += `: \`${parameterValue}\``
    }
    let additions = []
    let type = docs.possibleValues.length
      ? capture.typeOf(docs.possibleValues[0])
      : capture.typeOf(parameterValue)
    if (type === 'string') type = ''
    if (type) additions.push(type)
    if (docs.required === false) additions.push('optional')
    additions = additions.join(', ')
    if (additions) document += ` (${additions})`
    if (docs.descriptions[0]) document += ` - ${docs.descriptions[0]}`
    document += '\n'
    let details = ''
    details += docs.descriptions
      .slice(1)
      .map(d => `${indent(indentLevel + 2)}${d}\n\n`)
      .join('')
    if (docs.defaultValue !== undefined) {
      details += `${indent(indentLevel + 2)}+ Default: \`${
        docs.defaultValue
      }\`\n\n`
    }
    if (docs.possibleValues.length) {
      details += `${indent(indentLevel + 2)}+ Members\n`
      details += docs.possibleValues
        .map(v => `${indent(indentLevel + 3)}+ \`${v}\`\n`)
        .join('')
      details += '\n'
    }
    if (details) document += `\n${details}`
  }
  document += '\n'
  return document
}

function generateHeaders(headers, indentLevel = 0) {
  let document = `${indent(indentLevel)}+ Headers\n\n`
  for (const headerName of Object.keys(headers)) {
    if (headerName.toLowerCase() === 'content-type') continue
    const values =
      capture.typeOf(headers[headerName]) === 'array'
        ? headers[headerName]
        : [headers[headerName]]
    for (const value of values) {
      document += `${indent(indentLevel + 2)}${headerName}: ${value}\n`
    }
  }
  document += '\n'
  return document
}

function msonEscape(text) {
  if (typeof text !== 'string') text = String(text)
  const lines = text.split(/\r\n|\r|\n/)
  text = lines.length > 1 ? `${lines[0]} ...` : lines[0]
  const reservedCharacters = [
    ':',
    '(',
    ')',
    '<',
    '>',
    '{',
    '}',
    '[',
    ']',
    '_',
    '*',
    '-',
    '+',
    '`'
  ]
  const reservedKeywords = [
    'Property',
    'Properties',
    'Item',
    'Items',
    'Member',
    'Members',
    'Include',
    'One of',
    'Sample',
    'Trait',
    'Traits',
    'Parameter',
    'Parameters',
    'Attribute',
    'Attributes',
    'Filter',
    'Validation',
    'Choice',
    'Choices',
    'Enumeration',
    'Enum',
    'Object',
    'Array',
    'Element',
    'Elements',
    'Description'
  ]
  const textToTest = text.toLowerCase()
  const shouldEscape =
    reservedCharacters.some(character =>
      textToTest.includes(character.toLowerCase())
    ) || reservedKeywords.some(keyword => textToTest === keyword.toLowerCase())
  if (!shouldEscape) return text
  let maxBacktickLength = 0
  for (const match of textToTest.match(/`+/gi) || []) {
    if (match.length > maxBacktickLength) maxBacktickLength = match.length
  }
  const surrounder = '`'.repeat(maxBacktickLength + 1)
  return `${surrounder}${maxBacktickLength > 0 ? ' ' : ''}${text}${
    maxBacktickLength > 0 ? ' ' : ''
  }${surrounder}`
}

function objectToMson(
  object,
  rootName = '',
  indentLevel = 0,
  extraNewline = true,
  ignoreRootType = false
) {
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
      document += '+'
      if (node.isLeaf) document += ' '
    }
    if (nodeValue !== null && nodeValue !== undefined) {
      const escapedValue = msonEscape(nodeValue)
      if (node.isLeaf && escapedValue) {
        if ((node.key || node.depth === 0) && rootName) document += ': '
        document += escapedValue
      }
    }
    let additions = []
    if (docs.possibleValues.length) {
      additions.push('enum')
    } else {
      let ignoreValueType = false
      if (node.valueType === 'string') ignoreValueType = true
      if (
        !node.isLeaf &&
        node.valueType === 'object' &&
        (node.key || (node.depth === 0 && rootName))
      )
        ignoreValueType = true
      if (node.depth === 0 && ignoreRootType) ignoreValueType = true
      if (!ignoreValueType) additions.push(node.valueType)
    }
    if (docs.required) additions.push('required')
    if (docs.fixed) additions.push('fixed')
    if (docs.fixedType) additions.push('fixed-type')
    if (docs.nullable || nodeValue === null || nodeValue === undefined)
      additions.push('nullable')
    let sampleEmitted = false
    let defaultEmitted = false
    if (
      docs.sampleValues.length === 1 &&
      JSON.stringify(docs.sampleValues[0]) === JSON.stringify(nodeValue)
    ) {
      additions.push('sample')
      sampleEmitted = true
    } else if (
      docs.defaultValue !== undefined &&
      JSON.stringify(docs.defaultValue) === JSON.stringify(nodeValue)
    ) {
      additions.push('default')
      defaultEmitted = true
    }
    additions = additions.join(', ')
    if (additions) document += ` (${additions})`
    if (node.depth > 0 && docs.descriptions[0])
      document += ` - ${docs.descriptions[0]}`
    document += '\n'
    let needChildrenHeader = false
    if (node.depth > 0 && docs.descriptions.length > 1) {
      document += '\n'
      document += docs.descriptions
        .slice(1)
        .map(d => `${indent(baseIndent + 1)}${d}\n\n`)
        .join('')
      needChildrenHeader = true
    }
    if (docs.possibleValues.length) {
      document += objectToMson(
        docs.possibleValues,
        'Members',
        baseIndent + 1,
        false,
        true
      )
      needChildrenHeader = true
    }
    if (docs.defaultValue && !defaultEmitted) {
      document += objectToMson(
        docs.defaultValue,
        'Default',
        baseIndent + 1,
        false,
        true
      )
      needChildrenHeader = true
    }
    if (docs.sampleValues.length && !sampleEmitted) {
      document += docs.sampleValues
        .map(sampleValue => {
          return objectToMson(
            sampleValue,
            'Sample',
            baseIndent + 1,
            false,
            true
          )
        })
        .join('')
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

function generate(group) {
  const groupStack = [group]
  let document = ''
  while (groupStack.length) {
    const group = groupStack.shift()
    groupStack.unshift(...group.children)

    let trimLeft = ''
    const groupParameters = {}
    const groupQueries = {}
    const groupRequestHeaders = {}
    let parent = group
    while (true) {
      if (parent.docs.basePath) trimLeft = `${parent.docs.basePath}/${trimLeft}`
      if (parent.parameters) Object.assign(groupParameters, parent.parameters)
      if (parent.queries) Object.assign(groupQueries, parent.queries)
      if (parent.requestHeaders)
        Object.assign(groupRequestHeaders, parent.requestHeaders)
      if (!parent.parent) break
      parent = parent.parent
    }

    // Group header & descriptions
    if (group.depth === 0) {
      document += 'FORMAT: 1A9\n'
      if (group.docs.host) {
        document += `HOST: ${group.docs.schemes[0] || 'http'}://${
          group.docs.host
        }/${group.docs.basePath}\n`
      }
      document += '\n'
      if (group.docs.title) {
        document += `# ${group.docs.title}`
        if (group.docs.version) document += ` ${group.docs.version}`
        document += '\n\n'
      } else if (group.docs.version) {
        document += `# API Documentation ${group.docs.title}\n\n`
      }
    } else {
      if (group.depth === 1 && group.children.length) {
        // is Resource Group
        document += `# Group ${group.docs.title || 'Untitled'}`
        if (group.docs.version) document += ` ${group.docs.version}`
        document += '\n\n'
      } else {
        document += group.depth === 1 ? '# ' : '## '
        const path = convertPath(group.docs.basePath, group.queries)
        let title = group.docs.title
        if (!title && (!group.docs.basePath || group.docs.version))
          title = 'Untitled Resource'
        if (title) {
          document += title
          if (group.docs.version) document += ` ${group.docs.version}`
          if (group.docs.basePath) document += ` [${path}]`
        } else {
          document += path
        }
        document += '\n\n'

        // Resource parameters
        if (
          Object.keys(groupParameters).length ||
          Object.keys(groupQueries).length
        )
          document += generateDocForParameters(
            Object.assign({}, groupParameters, groupQueries)
          )
      }
    }
    document += group.docs.descriptions.reduce((p, c) => p + c + '\n\n', '')

    // Group actions
    for (const action of group.actions) {
      // Action header & descriptions
      document += action.group.depth === 1 ? '## ' : '### '
      let url = action.docs.url.replace(
        pathToRegexp(trimLeft, { end: false }),
        ''
      )
      const actionAllQueries = Object.assign({}, ...action.queries)
      if (
        url ||
        JSON.stringify(actionAllQueries) !==
          JSON.stringify(parent.queries || {})
      ) {
        url = action.docs.url.replace(
          pathToRegexp(parent.docs.basePath, { end: false }),
          ''
        )
        url = convertPath(url, actionAllQueries)
      }
      if (action.docs.title) {
        document += `${action.docs.title} [${action.docs.method}`
        document += action.docs.url ? ` ${url}]` : ']'
      } else {
        document += action.docs.method
        if (action.docs.url) document += ` ${url}`
      }
      document += '\n\n'
      document += action.docs.descriptions.reduce((p, c) => p + c + '\n\n', '')

      const hasGroupHeaders = Object.keys(groupRequestHeaders).length
      const cycle = Math.max(
        action.parameters.length,
        action.queries.length,
        action.requestHeaders.length,
        hasGroupHeaders ? 1 : 0,
        action.requestBodies.length,
        action.responseHeaders.length,
        action.statusCodes.length,
        action.responseBodies.length
      )
      for (let i = 0; i < cycle; ++i) {
        const hasParameters = action.parameters[i] || action.queries[i]
        // Action parameters
        if (i === 0 && hasParameters) {
          document += generateDocForParameters(
            Object.assign({}, action.parameters[i], action.queries[i])
          )
        }

        // Action request
        if (
          hasGroupHeaders ||
          action.requestHeaders[i] ||
          action.requestBodies[i] ||
          (i > 0 && hasParameters)
        ) {
          document += '+ Request'
          const docs = capture.docs(action.requestBodies[i])
          if (docs.descriptions[0]) document += ` ${docs.descriptions[0]}`
          let contentType = 'application/json'
          if (
            action.requestHeaders[i] &&
            action.requestHeaders[i]['content-type']
          ) {
            contentType = action.requestHeaders[i]['content-type'].split(';')[0]
          }
          document += ` (${contentType})\n\n`
          if (hasGroupHeaders || action.requestHeaders[i]) {
            document += generateHeaders(
              Object.assign(
                {},
                groupRequestHeaders || {},
                action.requestHeaders[i]
              ),
              1
            )
          }
          if (i > 0 && hasParameters) {
            document += generateDocForParameters(
              Object.assign({}, action.parameters[i], action.queries[i]),
              1
            )
          }
          if (action.requestBodies[i] && contentType === 'application/json') {
            document += objectToMson(action.requestBodies[i], 'Attributes', 1)
          }
        }

        // Action response
        if (
          action.responseHeaders[i] ||
          action.statusCodes[i] ||
          action.responseBodies[i]
        ) {
          let contentType = 'application/json'
          if (
            action.responseHeaders[i] &&
            action.responseHeaders[i]['content-type']
          )
            contentType = action.responseHeaders[i]['content-type'].split(
              ';'
            )[0]
          document += `+ Response ${action.statusCodes[i] ||
            200} (${contentType})\n\n`
          if (action.responseHeaders[i]) {
            document += generateHeaders(action.responseHeaders[i], 1)
          }
          if (action.responseBodies[i] && contentType === 'application/json') {
            document += objectToMson(action.responseBodies[i], 'Attributes', 1)
          }
        }
      }
    }
  }
  return document
}

module.exports.generate = generate

/* istanbul ignore else */
if (process.env.TEST2DOC_ENV === 'test') {
  module.exports.convertPath = convertPath
  module.exports.indent = indent
  module.exports.generateDocForParameters = generateDocForParameters
  module.exports.msonEscape = msonEscape
  module.exports.objectToMson = objectToMson
}
