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

function isWrapperType (obj) {
  return obj instanceof Number ||
    obj instanceof String ||
    obj instanceof Boolean ||
    obj[wrapperSymbol]
}

function wrap (object) {
  if (object === null) return nullWrapper
  if (object === undefined) return undefinedWrapper
  return Object(object)
}

function capture (object, path, contextToMerge) {
  let context
  if (contextToMerge) {
    context = {}
    context.object = contextToMerge.object
    context.path = path
    context.propertyProxies = Object.keys(contextToMerge.propertyProxies).map(property => {
      const propertyContext = contextToMerge.propertyProxies[property][contextSymbol]
      return capture(propertyContext.object, [...path, property], propertyContext)
    })
    context.docs = clone(contextToMerge.docs)
  } else {
    context = {
      object,
      path: path || [],
      propertyProxies: {},
      docs: {
        descriptions: [],
        required: undefined,
        nullable: undefined,
        fixed: undefined,
        fixedType: undefined,
        possibleValues: [],
        defaultValue: undefined,
        sampleValue: undefined,
        statusCode: undefined
      }
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
    sample (sampleValue) {
      context.docs.sampleValue = sampleValue
      return context.proxy
    },
    status (statusCode) {
      context.docs.statusCode = statusCode
      return context.proxy
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

function traverse (object, visitFn, map = false) {
  function childrenOf (node) {
    let children = []
    node.valueType = typeOf(node.value)
    if (node.valueType === 'object' && node.value) {
      children = Object.keys(node.value).map(key => {
        return {
          key: key,
          value: node.value[key],
          depth: node.depth + 1,
          parent: node
        }
      })
    } else if (node.valueType === 'array') {
      children = node.value.map((item, index) => {
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
      if (typeOf(newObject) === 'object' && newObject) newObject = Object.assign({}, newObject)
      if (node.depth === 0) {
        object = newObject
      } else {
        node.parent.value[node.key || node.index] = newObject
      }
      children = childrenOf(Object.assign(node, { value: newObject }))
    }
    stack.unshift(...children)
  }
  return object
}

function uncapture (object) {
  return traverse(object, node => {
    if (node.value === null || node.value === undefined) return node.value
    const nodeContext = node.value[contextSymbol]
    if (nodeContext) return nodeContext.object
    return node.value
  }, true)
}

function docs (object) {
  const context = object[contextSymbol]
  return context ? context.docs : {}
}

module.exports = capture
module.exports.undo = uncapture
module.exports.docs = docs
module.exports.typeOf = typeOf
module.exports.traverse = traverse
