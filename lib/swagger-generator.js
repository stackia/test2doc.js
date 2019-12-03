const { pathToRegexp, compile } = require('path-to-regexp')
const yaml = require('js-yaml')

const capture = require('./capture')
const Group = require('./group')

function convertPath(path) {
  const keys = []
  pathToRegexp(path, keys)
  const parameters = {}
  for (const key of keys) {
    parameters[key.name] = `{${key.name}}`
  }
  path = compile(path)(parameters)
    .replace(/%7B/g, '{')
    .replace(/%7D/g, '}')
  return path.startsWith('/') ? path : `/${path}`
}

function generateParameters(parameterTypes, groupOrAction) {
  const resultParameters = []
  parameterTypes.forEach(parameterType => {
    const groupParameters = {}
    if (groupOrAction instanceof Group) {
      let parent = groupOrAction
      while (true) {
        if (parent[parameterType])
          Object.assign(groupParameters, parent[parameterType])
        if (!parent.parent) break
        parent = parent.parent
      }
    }
    if (
      groupOrAction instanceof Group
        ? Object.keys(groupParameters).length
        : groupOrAction[parameterType].length
    ) {
      const parameters =
        groupOrAction instanceof Group
          ? groupParameters
          : groupOrAction[parameterType][0] || {}
      let parameter
      if (parameterType === 'requestBodies') {
        parameter = {
          name: 'body',
          in: 'body',
          schema: jsonSchemaFromObject(parameters, false)
        }
        resultParameters.push(parameter)
      } else {
        for (const key of Object.keys(parameters)) {
          parameter = Object.assign(
            jsonSchemaFromObject(parameters[key], false),
            {
              name: key,
              in: {
                parameters: 'path',
                queries: 'query',
                requestHeaders: 'header'
              }[parameterType]
            }
          )
          if (parameterType === 'parameters') parameter.required = true
          resultParameters.push(parameter)
        }
      }
    }
  })
  return resultParameters
}

function jsonSchemaFromObject(
  object,
  splitDescriptions,
  uncaptured,
  key,
  parentSchema
) {
  const schema = {}
  const value = uncaptured || capture.undo(object)
  const type = typeof value
  if (value === null || value === undefined) {
    schema.type = 'null'
  } else if (type === 'number') {
    schema.type = 'number'
  } else if (type === 'boolean') {
    schema.type = 'boolean'
  } else if (type === 'string') {
    schema.type = 'string'
  } else if (value instanceof Array) {
    schema.type = 'array'
    if (value.length)
      schema.items = jsonSchemaFromObject(
        object[0],
        splitDescriptions,
        value[0],
        0,
        schema
      )
  } else {
    schema.type = 'object'
    const keys = Object.keys(value)
    if (keys.length) {
      schema.properties = {}
      for (const key of Object.keys(value)) {
        schema.properties[key] = jsonSchemaFromObject(
          object[key],
          splitDescriptions,
          value[key],
          key,
          schema
        )
      }
    }
  }
  const docs = capture.docs(object)
  if (docs.descriptions.length) {
    if (splitDescriptions) {
      schema.title = docs.descriptions[0]
      if (docs.descriptions.length > 1) {
        schema.description = docs.descriptions.slice(1).join('\n\n')
      }
    } else {
      schema.description = docs.descriptions.join('\n\n')
    }
  }
  if (docs.defaultValue !== undefined) {
    schema.default = docs.defaultValue
  }
  if (docs.possibleValues.length) {
    schema.enum = docs.possibleValues
  }
  if (docs.sampleValues.length) {
    schema.example = docs.sampleValues[0]
  }
  if (docs.required) {
    if (parentSchema) {
      if (typeof key === 'number') {
        parentSchema.minItems = key + 1
      } else {
        if (!parentSchema.required) parentSchema.required = []
        parentSchema.required.push(key)
      }
    } else {
      schema.required = true
    }
  }
  return schema
}

function generate(group, options = {}) {
  options = Object.assign(
    {
      useYaml: true,
      indent: 2
    },
    options
  )

  const swagger = {
    swagger: '2.0',
    info: {
      title: group.docs.title || 'API Documentation',
      version: group.docs.version || '1.0.0'
    },
    paths: {}
  }

  if (group.docs.descriptions.length)
    swagger.info.description = group.docs.descriptions.join('\n\n')
  if (group.docs.host) swagger.host = group.docs.host
  if (group.docs.basePath) swagger.basePath = `/${group.docs.basePath}`
  if (group.docs.schemes.length) swagger.schemes = group.docs.schemes

  const groupStack = [group]
  while (groupStack.length) {
    const group = groupStack.shift()
    groupStack.unshift(...group.children)

    if (group.docs.title && group.actions.length) {
      if (!swagger.tags) swagger.tags = []
      const tagIndex = swagger.tags.findIndex(
        tag => tag.name === group.docs.title
      )
      if (tagIndex >= 0) {
        const tag = swagger.tags[tagIndex]
        if (group.docs.descriptions.length) {
          const description = group.docs.descriptions.join('\n\n')
          if (description !== tag.description) {
            if (tag.description) tag.description += `\n\n${description}`
            else tag.description = description
          }
        }
      } else {
        const tag = {
          name: group.docs.title
        }
        if (group.docs.descriptions.length)
          tag.description = group.docs.descriptions.join('\n\n')
        swagger.tags.push(tag)
      }
    }

    for (const action of group.actions) {
      let url = `/${action.docs.url}`
      if (swagger.basePath)
        url = url.replace(
          pathToRegexp(swagger.basePath, undefined, { end: false }),
          ''
        )
      url = convertPath(url)
      if (!swagger.paths[url]) swagger.paths[url] = {}

      const method = action.docs.method.toLowerCase()
      if (swagger.paths[url][method]) {
        // combine title and description for duplicated operations
        const operation = swagger.paths[url][method]

        if (group.docs.title) {
          if (!operation.tags) operation.tags = []
          if (!operation.tags.includes(group.docs.title))
            operation.tags.push(group.docs.title)
        }

        if (action.docs.title && action.docs.title !== operation.summary) {
          if (operation.summary) operation.summary += ` ${action.docs.title}`
          else operation.summary = action.docs.title
        }

        if (action.docs.descriptions.length) {
          const description = action.docs.descriptions.join('\n\n')
          if (description !== operation.description) {
            if (operation.description)
              operation.description += `\n\n${description}`
            else operation.description = description
          }
        }
      } else {
        const operation = {
          responses: {}
        }
        swagger.paths[url][method] = operation

        if (group.docs.title) operation.tags = [group.docs.title]
        if (action.docs.title) operation.summary = action.docs.title
        if (action.docs.descriptions.length)
          operation.description = action.docs.descriptions.join('\n\n')

        const parameters = generateParameters(
          ['requestHeaders', 'parameters', 'queries'],
          group
        ).concat(
          generateParameters(
            ['requestHeaders', 'parameters', 'queries', 'requestBodies'],
            action
          )
        )
        if (parameters.length) operation.parameters = parameters

        const cycle = Math.max(
          action.responseHeaders.length,
          action.statusCodes.length,
          action.responseBodies.length
        )
        for (let i = 0; i < cycle; ++i) {
          if (
            action.responseBodies[i] ||
            action.statusCodes[i] ||
            action.responseHeaders[i]
          ) {
            const statusCode = action.statusCodes[i] || 200
            let contentType = 'application/json'
            if (operation.responses[statusCode]) continue
            if (
              action.responseHeaders[i] &&
              action.responseHeaders[i]['content-type']
            ) {
              contentType = action.responseHeaders[i]['content-type'].split(
                ';'
              )[0]
            }
            const response = { description: '' }
            if (action.responseBodies[i]) {
              const docs = capture.docs(action.responseBodies[i])
              response.description = docs.descriptions.join('\n\n')
              if (contentType === 'application/json') {
                response.schema = jsonSchemaFromObject(
                  action.responseBodies[i],
                  true
                )
                response.examples = {
                  [contentType]: capture.undo(action.responseBodies[i], true)
                }
              }
            }
            if (action.responseHeaders[i]) {
              response.headers = {}
              for (const headerName of Object.keys(action.responseHeaders[i])) {
                response.headers[headerName] = jsonSchemaFromObject(
                  action.responseHeaders[i][headerName],
                  false
                )
              }
            }
            operation.responses[statusCode] = response
          }
        }
      }
    }
  }

  return options.useYaml
    ? yaml.safeDump(swagger, {
        indent: options.indent,
        lineWidth: -1,
        noRefs: true
      })
    : JSON.stringify(swagger, null, options.indent)
}

module.exports.generate = generate

/* istanbul ignore else */
if (process.env.TEST2DOC_ENV === 'test') {
  module.exports.convertPath = convertPath
}
