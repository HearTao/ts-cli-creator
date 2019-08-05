import { ts, JSDoc, JSDocTag, InterfaceDeclaration, JSDocableNode, Type, Node, EnumDeclaration, FunctionDeclaration, ParameterDeclaration } from 'ts-morph'

export type TransformResult = {
  description: ts.StringLiteral
  positionals: [ string, ts.CallExpression ][],
  options: ts.CallExpression[]
}

type TransformCallResult = {
  name: string
  properties: { [key: string]: ts.Expression }
}

// #region option

const enum OptionType {
  String,
  Number,
  Boolean,
  ArrayString,
  ArrayNumber,
  ArrayBoolean,
  Enum
}

export const enum OptionControlledTag {
  Type = 'type',
  Array = 'array',
  Choices = 'choices',
  Description = 'description',
  Desc = 'desc',
  Describe = 'describe'
}

export const enum OptionSupportedTag {
  Alias = 'alias',
  Default = 'default',
  DemandOption = 'demandOption',
  Required = 'required'
}

const OptionControlledTags: string[] = [
  OptionControlledTag.Type,
  OptionControlledTag.Array,
  OptionControlledTag.Choices,
  OptionControlledTag.Description,
  OptionControlledTag.Describe,
  OptionControlledTag.Desc
]

type MappedOptionType = 
  | [ OptionType.String, null ]
  | [ OptionType.Number, null ]
  | [ OptionType.Boolean, null ]
  | [ OptionType.ArrayString, null ]
  | [ OptionType.ArrayNumber, null ]
  | [ OptionType.ArrayBoolean, null ]
  | [ OptionType.Enum, EnumDeclaration ]

function mapToOptionType(type: Type): MappedOptionType {
  const text: string = type.getText()
  switch(text) {
    case `string`: return [ OptionType.String, null ]
    case `number`: return [ OptionType.Number, null ]
    case `boolean`: return [ OptionType.Boolean, null ]
    case `string[]`: 
    case `Array<string>`: return [ OptionType.ArrayString, null ]
    case `number[]`: 
    case `Array<number>`: return [ OptionType.ArrayNumber, null ]
    case `boolean[]`:
    case `Array<boolean>`: return [ OptionType.ArrayBoolean, null ]
    default: {
      const typeError: Error = makeUnsupportsTypeError(`option`, text)
      const symbol = type.getSymbol()
      if(undefined === symbol) throw typeError
      const decls = symbol.getDeclarations()
      if(0 === decls.length) throw typeError
      const decl = decls[0]
      if(!isEnumDeclaration(decl)) throw typeError
      return [ OptionType.Enum, decl ]
    }
  }
}

function isEnumDeclaration(node: Node): node is EnumDeclaration {
  return ts.SyntaxKind.EnumDeclaration === node.getKind()
}

function transformOptionType(mappedType: MappedOptionType): { [key: string]: ts.Expression } {
  switch(mappedType[0]) {
    case OptionType.String: return { 
      [OptionControlledTag.Type]: ts.createStringLiteral(`string`) 
    }
    case OptionType.Number: return { 
      [OptionControlledTag.Type]: ts.createStringLiteral(`number`) 
    }
    case OptionType.Boolean: return { 
      [OptionControlledTag.Type]: ts.createStringLiteral(`boolean`) 
    }
    case OptionType.ArrayString: return { 
      [OptionControlledTag.Type]: ts.createStringLiteral(`string`), 
      [OptionControlledTag.Array]: ts.createTrue()
    }
    case OptionType.ArrayNumber: return { 
      [OptionControlledTag.Type]: ts.createStringLiteral(`number`), 
      [OptionControlledTag.Array]: ts.createTrue()
    }
    case OptionType.ArrayBoolean: return { 
      [OptionControlledTag.Type]: ts.createStringLiteral(`boolean`), 
      [OptionControlledTag.Array]: ts.createTrue()
    }
    case OptionType.Enum: return makeEnumOption(mappedType[1])
    default: throw makeUnknownYargsTypeError(mappedType[0])
  }
}

function makeEnumOption(enumDecl: EnumDeclaration): ReturnType<typeof transformOptionType> {
  const enumName: string = enumDecl.getName()
  const members = enumDecl.getMembers()
  const nodes = members.map(member => {
    const name: string = member.getName()
    return ts.createPropertyAccess(
      ts.createIdentifier(enumName),
      ts.createIdentifier(name)
    )
  })
  return {
    [OptionControlledTag.Type]: ts.createStringLiteral(`string`),
    [OptionControlledTag.Choices]: ts.createArrayLiteral(nodes, false)
  }
}


export function transformOption(interfaceDecl: InterfaceDeclaration): ts.CallExpression[] {
  const props: TransformCallResult[] = makeOptionsProperties(interfaceDecl)
  return props.map(result => makeCallableNode(`option`, result))
}


function makeOptionsProperties(decl: InterfaceDeclaration): TransformCallResult[] {
  return decl.getProperties().map(property => {
    const name: string = property.getName()
    
    const type = property.getType()
    const typeNode = transformOptionType(mapToOptionType(type))
    const jsdoc: JSDoc | undefined = getJSDoc(property)

    return { 
      name, 
      properties: { 
        ...typeNode, 
        ...(jsdoc ? makeOptionJSDocNode(jsdoc, type) : {}) 
      } 
    }
  })
}

function makeOptionJSDocNode(jsdoc: JSDoc, type: Type): { [key: string]: ts.Expression } {
  const props = makeOptionJSDocTag(jsdoc.getTags(), type)
  const comment: string | undefined = jsdoc.getComment()
  return { 
    ...props, 
    ...(comment ? makeDescriptionNode(OptionControlledTag.Description, comment) : {})
  }
}

function makeOptionJSDocTag(tags: JSDocTag[], _type: Type): { [key: string]: ts.Expression } {
  return tags.reduce<{ [key: string]: ts.Expression }>((acc, tag) => {
    const comment: string | undefined = tag.getComment()
    const name: string = stringifyJSDocTag(tag)

    switch(name) {
      case OptionSupportedTag.Alias: {
        if(undefined === comment) break
        acc[OptionSupportedTag.Alias] = ts.createLiteral(comment)
        break
      }

      case OptionSupportedTag.Default: {
        if(undefined === comment) break
        acc[OptionSupportedTag.Default] = parseExprStmt(comment)
        break
      }

      case OptionSupportedTag.DemandOption:
      case OptionSupportedTag.Required: {
        acc[OptionSupportedTag.DemandOption] = ts.createTrue()
        break
      }

      default: {
        const warning: string = OptionControlledTags.includes(name) 
          ? makeUseControlledTagWarning(name)
          : makeUnUseSupportedTagWarning(name)
        console.warn(warning)
        break
      }
    }

    return acc
  }, Object.create(null))
}

function makeUseControlledTagWarning(tag: string): string {
  return `[ts-cli] Option property "${tag}" was controlled, please removed`
}

function makeUnUseSupportedTagWarning(tag: string): string {
  return `[ts-cli] Option property "${tag}" was not supported`
}

// #endregion


// #region comnmand

const enum CommandType {
  String = 'string',
  Number = 'number',
  Boolean = 'boolean',
  Enum = 'string'
}

const enum CommandControlledTag {
  Type = 'type',
  Choices = 'choices',
  Description = 'description',
  Desc = 'desc',
  Describe = 'describe'
}

export const COMMAND_JSDOC_TAG: string = `command`
const COMMAND_POSITIONALS_NAME: string = `positional`
const COMMAND_OPTIONS_PARAMETER_REGEXP: RegExp = /^options?$/
export const COMMAND_POSITIONALS_JSDOCTAG_REGEXP: RegExp = /^(param|arg|argument)/

export function transformCommand(decl: FunctionDeclaration): TransformResult {
  const [ positionalParams, optionParam ] = getParams(decl)
  const positionals: [ string, ts.CallExpression ][] = makeCommandPositionals(positionalParams)
  const options: ts.CallExpression[] = optionParam ? transformOption(getOptionsInterfaceDecl(optionParam)) : []
  
  return {
    description: ts.createStringLiteral(''),
    positionals,
    options
  }
}

function getParams(decl: FunctionDeclaration, testRegExp: RegExp = COMMAND_OPTIONS_PARAMETER_REGEXP): [ ParameterDeclaration[], ParameterDeclaration | undefined ] {
  let optionParam: ParameterDeclaration | undefined
  const params: ParameterDeclaration[] = decl.getParameters()
  const lstParam: ParameterDeclaration | undefined = params.pop()
  if(undefined === lstParam) return [ params, optionParam ]
  
  const lstName: string = lstParam.getName()

  if(testRegExp.test(lstName)) optionParam = lstParam
  else params.push(lstParam)

  return [ params, optionParam ]
}

function getOptionsInterfaceDecl(param: ParameterDeclaration): InterfaceDeclaration {
  const type: Type = param.getType()
  if(undefined === type) throw makeUnsupportsTypeError(`options`, `No type found`)
  if(!type.isInterface()) throw makeUnsupportsTypeError(`options`, `Only Interface supports`)
  const symbol = type.getSymbol()
  if(undefined === symbol) throw new Error(`no symbol`)
  const decl = symbol.getDeclarations()
  if(decl.length === 0) throw new Error(`no decl`)
  return (decl[0] as InterfaceDeclaration)
}

function makeCommandPositionals(params: ParameterDeclaration[]): [ string, ts.CallExpression ][] {
  const props: TransformCallResult[] = makeCommandProperties(params)
  return props.map(result => ([ result.name, makeCallableNode(COMMAND_POSITIONALS_NAME, result) ]))
}

export function makeCommandProperties(params: ParameterDeclaration[]): TransformCallResult[] {
  return params.map(param => {
    const name: string = param.getName()
    return {
      name,
      properties: {
        ...makeCommandTypeExpression(param),
        ...makeCommandDescriptionExpression(param)
      }
    }
  })
}

export function makeCommandTypeExpression(param: ParameterDeclaration): { [key: string]: ts.Expression } {
  const name: string = param.getName()
  const type: Type = param.getType()
  
  if(type.isAny()) {
    reportPositionalAnyType(name)
    return { [CommandControlledTag.Type]: ts.createStringLiteral(CommandType.String) }
  }
  else if(type.isString()) return { [CommandControlledTag.Type]: ts.createStringLiteral(CommandType.String) }
  else if(type.isNumber()) return { [CommandControlledTag.Type]: ts.createStringLiteral(CommandType.Number) }
  else if(type.isBoolean()) return { [CommandControlledTag.Type]: ts.createStringLiteral(CommandType.Boolean) }
  // else if(type.isEnum()) return ts.createIdentifier()
  else throw makeUnsupportsTypeError(COMMAND_POSITIONALS_NAME, type.getText())
}

export function reportPositionalAnyType(name: string): void {
  console.warn(`Warning: The Command parameter "${name}" has "any" type`)
}

export function makeCommandDescriptionExpression(param: ParameterDeclaration): { description: ts.Expression } | {} {
  const tags: readonly ts.JSDocParameterTag[] = ts.getJSDocParameterTags(param.compilerNode)
  if(0 === tags.length) return {}
  const tag: ts.JSDocParameterTag = tags[tags.length - 1]
  const comment: string | undefined = tag.comment
  if(undefined === comment) return {}
  const trimed: string = comment.trim()
  const description: string = trimed.startsWith(`-`) ? trimed.replace(/^-/, '').trim() : trimed
  return makeDescriptionNode(CommandControlledTag.Description, description)
}

// #endregion


// #region helper

function makeCallableNode(iden: string, result: TransformCallResult): ts.CallExpression {
  return ts.createCall(
    ts.createIdentifier(iden),
    undefined,
    [ 
      ts.createStringLiteral(result.name), 
      makePropsNode(result.properties)
    ]
  )
}

function makePropsNode(props: { [key: string]: ts.Expression }): ts.ObjectLiteralExpression {
  const objects = []
  for (const key in props) {
    if (props.hasOwnProperty(key)) {
      const value = props[key]
      objects.push(
        ts.createPropertyAssignment(
          ts.createIdentifier(key),
          value
        )
      )
    }
  }

  return ts.createObjectLiteral(objects, false)
}

export function parseExprStmt(code: string): ts.Expression {
  const sourceFile: ts.SourceFile = ts.createSourceFile(`tmp.ts`, code, ts.ScriptTarget.ESNext, false, ts.ScriptKind.TS)
  const nodes = sourceFile.statements
  if(0 === nodes.length) throw new Error(`No node found`)
  const node: ts.Statement = nodes[0]
  if(!ts.isExpressionStatement(node)) throw new Error(`Node not ExpressionStatement`)
  const expr: ts.Expression = node.expression
  expr.flags = ts.NodeFlags.Synthesized
  expr.pos = -1
  expr.end = -1
  return expr
}

export function getJSDoc(node: JSDocableNode): JSDoc | undefined {
  const jsdocs = node.getJsDocs()
  const len = jsdocs.length
  if(0 === len) return undefined
  return jsdocs[len - 1]
}

type JSDocTest = string | RegExp | ((name: string) => boolean)

export function getJSDocTags(jsdoc: JSDoc | undefined, test: JSDocTest): JSDocTag[] {
  if(undefined === jsdoc) return []
  return jsdoc.getTags().map(tag => {
    const name: string = tag.getTagName()
    if(`function` === typeof test) return test(name) ? tag : null
    else if(test instanceof RegExp) return test.test(name) ? tag : null
    else if(`string` === typeof test) return test === name ? tag : null
    else throw makePredicateTypeError()
  }).filter((tag): tag is JSDocTag => null !== tag)
}

function makePredicateTypeError(): Error {
  return new TypeError(`Unsupports predicate type`)
}

export function getJSDocTag(jsdoc: JSDoc | undefined, test: JSDocTest, index: number = 0): JSDocTag | undefined {
  const res = getJSDocTags(jsdoc, test)
  if(undefined === res) return undefined
  if(index < 0) return res[res.length + index]
  return res[index]
}

export function stringifyJSDocTag(tag: JSDocTag): string {
  return tag.getText().replace(/^@/, '').trim()
}

function makeDescriptionNode(key: string, comment: string) {
  return {
    [key]: ts.createStringLiteral(comment)
  }
}

export function makeUnsupportsTypeError(name: string, type: string): Error {
  return new Error(`Unsupports ${name} type "${type}"`)
}

export function makeUnknownYargsTypeError<T>(type: T): Error {
  return new Error(`Unknown yargs type "${type}"`)
}

// #endregion
