const symbolDesc = require('symbol-description')
const clone = require('clone')

const contextSymbol = Symbol('context')
const wrapperSymbol = Symbol('wrapper')

const nullWrapper = {
  [wrapperSymbol]: true,
  valueOf () {
    return null
  }
}

const undefinedWrapper = {
  [wrapperSymbol]: true,
  valueOf () {
    return undefined
  }
}

const defaultDocs = {
  descriptions: [],
  required: undefined,
  nullable: undefined,
  fixed: undefined,
  fixedType: undefined,
  possibleValues: [],
  defaultValue: undefined,
  sampleValues: [],
  statusCode: undefined,
  offset: undefined,
  limit: undefined
}

function isWrapperType (obj) {
  return !!(obj instanceof Number ||
    obj instanceof String ||
    obj instanceof Boolean ||
    (obj && obj[wrapperSymbol]))
}

function wrap (object) {
  if (object === null) return nullWrapper
  if (object === undefined) return undefinedWrapper
  return Object(object)
}

function capture (object, path, contextToMerge) {
  let context
  if (contextToMerge) {
    context = {
      object: object,
      path: path,
      propertyProxies: {},
      docs: clone(contextToMerge.docs)
    }
    for (const property of Object.keys(contextToMerge.propertyProxies)) {
      const propertyContext = contextToMerge.propertyProxies[property][contextSymbol]
      context.propertyProxies[property] = capture(propertyContext.object, [...path, property], propertyContext)
    }
  } else {
    context = {
      object,
      path: path || [],
      propertyProxies: {},
      docs: clone(defaultDocs)
    }
  }
  object = wrap(object)
  const docDescriptor = Object.assign(Object.create(Object.getPrototypeOf(object)), {
    desc (...descriptions) {
      context.docs.descriptions = descriptions
      return context.proxy
    },
    required () {
      context.docs.required = true
      return context.proxy
    },
    optional () {
      context.docs.required = false
      return context.proxy
    },
    nullable (nullable = true) {
      context.docs.nullable = nullable
      return context.proxy
    },
    fixed (fixed = true) {
      context.docs.fixed = fixed
      return context.proxy
    },
    fixedType (fixedType = true) {
      context.docs.fixedType = fixedType
      return context.proxy
    },
    enum (...possibleValues) {
      context.docs.possibleValues = possibleValues
      return context.proxy
    },
    default (defaultValue) {
      context.docs.defaultValue = defaultValue
      return context.proxy
    },
    sample (...sampleValues) {
      context.docs.sampleValues = sampleValues
      return context.proxy
    },
    status (statusCode) {
      context.docs.statusCode = statusCode
      return context.proxy
    },
    offset (offset) {
      context.docs.offset = offset
      return context.proxy
    },
    limit (limit) {
      context.docs.limit = limit
      return context.proxy
    },
    uncapture (shouldSliceArray = false) {
      return uncapture(context.proxy, shouldSliceArray)
    }
  })
  for (const propertySymbol of [Symbol('valueOf'), Symbol('toString')]) {
    docDescriptor[propertySymbol] = docDescriptor[symbolDesc(propertySymbol)]
    Object.defineProperty(docDescriptor, symbolDesc(propertySymbol), {
      get: function () {
        return this[propertySymbol].bind(this)
      }
    })
  }
  Object.setPrototypeOf(object, docDescriptor)
  context.proxy = new Proxy(object, {
    get (target, property) {
      if (property === contextSymbol) return context
      if (isWrapperType(target) || !target.hasOwnProperty(property)) return target[property]
      if (!context.propertyProxies[property]) {
        const path = [...context.path, property]
        if (Object(target[property])[contextSymbol]) {
          const targetContext = target[property][contextSymbol]
          context.propertyProxies[property] = capture(targetContext.object, path, targetContext)
        } else {
          context.propertyProxies[property] = capture(target[property], path)
        }
      }
      return context.propertyProxies[property]
    }
  })
  return context.proxy
}

function typeOf (target) {
  target = Object(target)
  if (target instanceof Array) return 'array'
  if (target instanceof Number) return 'number'
  if (target instanceof Boolean) return 'boolean'
  if (target instanceof String) return 'string'
  return 'object'
}

function sliceArray (array, offset, limit) {
  if (offset !== undefined || limit !== undefined) {
    offset = offset || 0
    limit = limit !== undefined ? limit : Infinity
    return array.slice(offset, offset + limit)
  }
  return array
}

function traverse (object, visitFn, map = false, inplaceUpdate = true) {
  function childrenOf (node) {
    let children = []
    node.valueType = typeOf(node.value)
    if (node.valueType === 'object' && node.value) {
      if (node.value[contextSymbol] && !node.value[contextSymbol].object) {
        return []
      }
      children = Object.keys(node.value).map(key => {
        return {
          key: key,
          value: node.value[key],
          depth: node.depth + 1,
          parent: node
        }
      })
    } else if (node.valueType === 'array') {
      const nodeDocs = docs(node.value)
      children = sliceArray(node.value, nodeDocs.offset, nodeDocs.limit).map((item, index) => {
        return {
          index,
          value: item,
          depth: node.depth + 1,
          parent: node
        }
      })
    }
    return children
  }

  const stack = [{ value: object, depth: 0 }]
  while (stack.length) {
    const node = stack.shift()
    let children = childrenOf(node)
    if (!children.length) node.isLeaf = true

    let newObject = visitFn(node)
    if (map) {
      const newObjectType = typeOf(newObject)
      if (newObjectType === 'object' && newObject) newObject = Object.assign({}, newObject)
      else if (newObjectType === 'array') newObject = newObject.slice()
      if (node.depth === 0) {
        object = newObject
        if (!inplaceUpdate) node.newValue = newObject
      } else if (inplaceUpdate) {
        node.parent.value[node.key || node.index] = newObject
      } else {
        node.parent.newValue[node.key || node.index] = newObject
        node.newValue = newObject
      }
      if (inplaceUpdate) children = childrenOf(Object.assign(node, { value: newObject }))
    }
    stack.unshift(...children)
  }
  return object
}

function uncapture (object, shouldSliceArray = false) {
  return traverse(object, node => {
    if (node.value === null || node.value === undefined) return node.value
    const nodeContext = node.value[contextSymbol]
    if (nodeContext) {
      if (shouldSliceArray && nodeContext.object instanceof Array) {
        const nodeDocs = docs(node.value)
        return sliceArray(nodeContext.object, nodeDocs.offset, nodeDocs.limit)
      }
      return nodeContext.object
    }
    return node.value
  }, true, !shouldSliceArray)
}

function docs (object) {
  if (object === null || object === undefined) return clone(defaultDocs)
  const context = object[contextSymbol]
  return context ? context.docs : clone(defaultDocs)
}

module.exports = capture
module.exports.undo = uncapture
module.exports.docs = docs
module.exports.typeOf = typeOf
module.exports.traverse = traverse

if (process.env.TEST2DOC_ENV === 'test') {
  module.exports.capture = capture
  module.exports.wrapperSymbol = wrapperSymbol
  module.exports.contextSymbol = contextSymbol
  module.exports.nullWrapper = nullWrapper
  module.exports.undefinedWrapper = undefinedWrapper
  module.exports.isWrapperType = isWrapperType
  module.exports.wrap = wrap
}
