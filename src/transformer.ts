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

const enum CliType {
  String = 'string',
  Number = 'number',
  Boolean = 'boolean',
}

type CliTypeProperties = 
  | { type: ts.StringLiteral }
  | { type: ts.StringLiteral, array: ts.BooleanLiteral } 
  | { choices: ts.ArrayLiteralExpression }


// #region option

const enum CliOptionsJSDocTag {
  Alias = 'alias',
  Default = 'default',
  DemandOption = 'demandOption',
  Require = 'require',
  Required = 'required'
}


export function transformOption(interfaceDecl: InterfaceDeclaration): ts.CallExpression[] {
  const props: TransformCallResult[] = makeOptionsProperties(interfaceDecl)
  return props.map(result => makeCallableNode(`option`, result))
}

function makeOptionsProperties(decl: InterfaceDeclaration): TransformCallResult[] {
  return decl.getProperties().map(property => {
    const name: string = property.getName()
    
    const type = property.getType()
    const typeExpr = makeOptionsTypeExpression(type)
    const descExpr = makeOptionsDescriptionExpression(decl)
    const tagExpr = makeOptionJSDocTagExpression(decl)

    return { 
      name, 
      properties: { 
        ...typeExpr,
        ...descExpr,
        ...tagExpr
      } 
    }
  })
}

export function makeOptionsTypeExpression(type: Type): CliTypeProperties {
  if(type.isString()) return makeTypeExpression(CliType.String)
  else if(type.isNumber()) return makeTypeExpression(CliType.Number)
  else if(type.isBoolean()) return makeTypeExpression(CliType.Boolean)
  else if(type.isArray()) {
    const elemType = type.getArrayElementType()
    if(undefined === elemType) throw new Error(`Unknown array element type`)
    if(elemType.isString()) return makeArrayTypeExpression(CliType.String)
    else if(elemType.isNumber()) return makeArrayTypeExpression(CliType.Number)
    else if(elemType.isBoolean()) return makeArrayTypeExpression(CliType.Boolean)
    else throw new Error(`Unsupports array element type ${elemType.getText()}`)
  }
  else if(type.isEnum()) {
    const decl = getEnumDeclarationFromType(type)
    const nodes = makeEnumMembersArrayNode(decl)
    return makeEnumTypeExpression(CliType.String, nodes)
  }
  else throw new TypeError(`Unsupportsed options type "${type.getText()}"`)
}

export function makeOptionsDescriptionExpression(decl: JSDocableNode): { description: ts.Expression } | {} {
  const jsdoc = getJSDoc(decl)
  if(undefined === jsdoc) return {}
  const comment = jsdoc.getComment()
  if(undefined === comment) return {}
  return { description: ts.createStringLiteral(comment.trim()) }
}

export function makeOptionJSDocTagExpression(decl: JSDocableNode): { [key: string]: ts.Expression } {
  const jsdoc = getJSDoc(decl)
  if(undefined === jsdoc) return {}
  return jsdoc.getTags().reduce<{ [key: string]: ts.Expression }>((acc, tag) => {
    const comment: string | undefined = tag.getComment()
    const name: string = tag.getTagName()

    switch(name) {
      case CliOptionsJSDocTag.Alias: {
        if(undefined === comment) break
        acc[CliOptionsJSDocTag.Alias] = ts.createLiteral(comment)
        break
      }

      case CliOptionsJSDocTag.Default: {
        if(undefined === comment) break
        acc[CliOptionsJSDocTag.Default] = parseExprStmt(comment)
        break
      }

      case CliOptionsJSDocTag.DemandOption:
      case CliOptionsJSDocTag.Require:
      case CliOptionsJSDocTag.Required: {
        acc[CliOptionsJSDocTag.DemandOption] = ts.createTrue()
        break
      }

      default: throw new Error(`Unsupports tag @${name}`)
    }

    return acc
  }, Object.create(null))
}

// #endregion


// #region comnmand

const COMMAND_POSITIONALS_NAME: string = `positional`
export const COMMAND_OPTIONS_PARAMETER_REGEXP: RegExp = /^options?$/
export const COMMAND_POSITIONALS_JSDOCTAG_REGEXP: RegExp = /^(param|arg|argument)/

export function transformCommand(decl: FunctionDeclaration): TransformResult {
  const [ positionalParams, optionParam ] = getParams(decl)
  const positionals = makeCommandPositionals(positionalParams)
  const options = optionParam ? transformOption(getOptionsInterfaceDecl(optionParam)) : []
  const description = getCommandDescription(decl)

  return {
    description,
    positionals,
    options
  }
}

export function getCommandDescription(decl: FunctionDeclaration): ts.StringLiteral {
  const jsdoc = getJSDoc(decl)
  if(undefined === jsdoc) return ts.createStringLiteral('')
  const comment = jsdoc.getComment()
  if(undefined === comment) return ts.createStringLiteral('')
  return ts.createStringLiteral(comment)
}

function getParams(decl: FunctionDeclaration, testRegExp: RegExp = COMMAND_OPTIONS_PARAMETER_REGEXP): [ ParameterDeclaration[], ParameterDeclaration | undefined ] {
  let optionParam: ParameterDeclaration | undefined
  const params: ParameterDeclaration[] = decl.getParameters()
  const lstParam = params.pop()
  if(undefined === lstParam) return [ params, optionParam ]
  
  const lstName = lstParam.getName()
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
  return makeCommandProperties(params).map(result => ([ 
    result.name,
    makeCallableNode(COMMAND_POSITIONALS_NAME, result) 
  ]))
}

export function makeCommandProperties(params: ParameterDeclaration[]): TransformCallResult[] {
  return params.map(param => {
    const name: string = param.getName()
    const [ typeExpr ] = makeCommandTypeExpression(param)
    const descExpr = makeCommandDescriptionExpression(param)
    return {
      name,
      properties: {
        ...typeExpr,
        ...descExpr
      }
    }
  })
}

export function makeCommandTypeExpression(param: ParameterDeclaration): [CliTypeProperties, string[] | undefined] {
  const name: string = param.getName()
  const type: Type = param.getType()
  console.log(
    type.compilerType.getSymbol()!.valueDeclaration!.kind,
    type.isEnumLiteral(),
    type.getText(),
    type.getSymbol()!.getValueDeclaration()!.getParent()!.getText()
  )
  if(type.isAny()) {
    reportPositionalAnyTypeWarning(name)
    return [makeTypeExpression(CliType.String), undefined]
  }
  else if(type.isString()) return [makeTypeExpression(CliType.String), undefined]
  else if(type.isNumber()) return [makeTypeExpression(CliType.Number), undefined]
  else if(type.isBoolean()) return [makeTypeExpression(CliType.Boolean), undefined]
  else if(type.isEnumLiteral()) {
    const decl = getEnumDeclarationFromEnumMemberType(type)
    const nodes = makeEnumMembersArrayNode(decl)
    return [makeEnumTypeExpression(CliType.String, nodes), undefined]
  }
  else if(type.isEnum()) {
    const decl = getEnumDeclarationFromType(type)
    const nodes = makeEnumMembersArrayNode(decl)
    return [makeEnumTypeExpression(CliType.String, nodes), undefined]
  }
  else throw makeUnsupportsTypeError(COMMAND_POSITIONALS_NAME, type.getText())
}

export function reportPositionalAnyTypeWarning(name: string): void {
  console.warn(`Warning: The Command parameter "${name}" has "any" type`)
}

export function makeCommandDescriptionExpression(param: ParameterDeclaration): { description: ts.Expression } | {} {
  const tags = ts.getJSDocParameterTags(param.compilerNode)
  if(0 === tags.length) return {}
  const tag = tags[tags.length - 1]
  const comment = tag.comment
  if(undefined === comment) return {}
  const trimed = comment.trim()
  const description = trimed.startsWith(`-`) ? trimed.replace(/^-/, '').trim() : trimed
  return { description: ts.createStringLiteral(description) }
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

function isEnumDeclaration(node: Node): node is EnumDeclaration {
  return ts.SyntaxKind.EnumDeclaration === node.getKind()
}

function getEnumDeclarationFromType(type: Type): EnumDeclaration {
  const symbol = type.getSymbol()
  if(undefined === symbol) throw new Error(`No symbol found`)
  const decl = symbol.getValueDeclaration()
  if(undefined === decl) throw new Error(`No declaration found`)
  if(!isEnumDeclaration(decl)) throw new Error(`The declaration not EnumDeclaration`)
  return decl
}

function getEnumDeclarationFromEnumMemberType(type: Type): EnumDeclaration {
  const symbol = type.getSymbol()
  if(undefined === symbol) throw new Error(`No symbol found`)
  const member = symbol.getValueDeclaration()
  if(undefined === member) throw new Error(`No declaration found`)
  const decl = member.getParent()
  if(undefined === decl) throw new Error(`No declaration found`)
  if(!isEnumDeclaration(decl)) throw new Error(`The declaration not EnumDeclaration`)
  return decl
}

function makeEnumMembersArrayNode(decl: EnumDeclaration): ts.ArrayLiteralExpression {
  const nodes: ts.PropertyAccessExpression[] = []
  const enumName = decl.getName()

  decl.getMembers().forEach(member => {
    const value = member.getValue()
    if(undefined === value) throw new Error(`The member ${member.getText()} not has value`)
    if(`string` !== typeof value) throw new TypeError(`The member ${member.getText()} value not string type`)
    nodes.push(
      ts.createPropertyAccess(
        ts.createIdentifier(enumName),
        ts.createIdentifier(member.getName())
      )
    )
  })
  return ts.createArrayLiteral(nodes, false)
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

export function makeUnsupportsTypeError(name: string, type: string): Error {
  return new Error(`Unsupports ${name} type "${type}"`)
}

export function makeUnknownYargsTypeError<T>(type: T): Error {
  return new Error(`Unknown yargs type "${type}"`)
}

function makeTypeExpression(type: CliType): CliTypeProperties {
  return { type: ts.createLiteral(type) }
}

function makeArrayTypeExpression(type: CliType): CliTypeProperties {
  return {
    ...makeTypeExpression(type),
    array: ts.createTrue()
  }
}

function makeEnumTypeExpression(_type: CliType, nodes: ts.ArrayLiteralExpression): CliTypeProperties {
  return {
    choices: nodes
  }
}

// #endregion
