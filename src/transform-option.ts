import { ts, JSDoc, JSDocTag, PropertySignature, InterfaceDeclaration, JSDocableNode, Type, Node, EnumDeclaration } from 'ts-morph'
import { Options as YargsOptions } from 'yargs'
// import unquote from 'util-extra/string/unquote'
// import {} from 'ts-creator'

const enum YargsType {
  String,
  Number,
  Boolean,
  ArrayString,
  ArrayNumber,
  ArrayBoolean,
  Enum
}

export const enum YargsControlledTag {
  Type = 'type',
  Array = 'array',
  Choices = 'choices',
  Description = 'description',
  Desc = 'desc',
  Describe = 'describe'
}

const YargsControlledTags: string[] = [
  YargsControlledTag.Type,
  YargsControlledTag.Array,
  YargsControlledTag.Choices,
  YargsControlledTag.Description,
  YargsControlledTag.Describe,
  YargsControlledTag.Desc
]

export const enum YargsSupportedTag {
  Alias = 'alias',
  Default = 'default',
  DemandOption = 'demandOption'
}

type MappedYargsType = 
  | [ YargsType.String, null ]
  | [ YargsType.Number, null ]
  | [ YargsType.Boolean, null ]
  | [ YargsType.ArrayString, null ]
  | [ YargsType.ArrayNumber, null ]
  | [ YargsType.ArrayBoolean, null ]
  | [ YargsType.Enum, EnumDeclaration ]

function mapToYargsType(type: Type): MappedYargsType {
  const text: string = type.getText()
  switch(text) {
    case `string`: return [ YargsType.String, null ]
    case `number`: return [ YargsType.Number, null ]
    case `boolean`: return [ YargsType.Boolean, null ]
    case `string[]`: 
    case `Array<string>`: return [ YargsType.ArrayString, null ]
    case `number[]`: 
    case `Array<number>`: return [ YargsType.ArrayNumber, null ]
    case `boolean[]`:
    case `Array<boolean>`: return [ YargsType.ArrayBoolean, null ]
    default: {
      const symbol = type.getSymbol()
      if(undefined === symbol) throw makeUnsupportsTypeError(text)
      const decls = symbol.getDeclarations()
      if(0 === decls.length) throw makeUnsupportsTypeError(text)
      const decl = decls[0]
      if(!isEnumDeclaration(decl)) throw makeUnsupportsTypeError(text)
      return [ YargsType.Enum, decl ]
    }
  }
}

export function parseExprStmt(code: string): ts.Expression {
  const sourceFile: ts.SourceFile = ts.createSourceFile(`tmp.ts`, code, ts.ScriptTarget.ESNext, false, ts.ScriptKind.TS)
  const nodes = sourceFile.statements
  if(0 === nodes.length) throw new Error(`No nodes found`)
  const node = nodes[0]
  if(!ts.isExpressionStatement(node)) throw new Error(`Node not ExpressionStatement`)
  const expr = node.expression
  expr.flags = ts.NodeFlags.Synthesized
  expr.pos = -1
  expr.end = -1
  return expr
}

function isEnumDeclaration(node: Node): node is EnumDeclaration {
  return ts.SyntaxKind.EnumDeclaration === node.getKind()
}

function transformYargsType(mappedType: MappedYargsType): { [key: string]: ts.Node } {
  switch(mappedType[0]) {
    case YargsType.String: return { [YargsControlledTag.Type]: ts.createLiteral(`string`) }
    case YargsType.Number: return { [YargsControlledTag.Type]: ts.createLiteral(`number`) }
    case YargsType.Boolean: return { [YargsControlledTag.Type]: ts.createLiteral(`boolean`) }
    case YargsType.ArrayString: return { [YargsControlledTag.Type]: ts.createLiteral(`string`), [YargsControlledTag.Array]: ts.createLiteral(true) }
    case YargsType.ArrayNumber: return { [YargsControlledTag.Type]: ts.createLiteral(`number`), [YargsControlledTag.Array]: ts.createLiteral(true) }
    case YargsType.ArrayBoolean: return { [YargsControlledTag.Type]: ts.createLiteral(`boolean`), [YargsControlledTag.Array]: ts.createLiteral(true) }
    case YargsType.Enum: return makeEnumOption(mappedType[1])
    default: throw makeUnknownYargsTypeError(mappedType[0])
  }
}

function makeEnumOption(enumDecl: EnumDeclaration): ReturnType<typeof transformYargsType> {
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
    [YargsControlledTag.Type]: ts.createLiteral(`string`),
    [YargsControlledTag.Choices]: ts.createArrayLiteral(nodes, false)
  }
}

export function makeUnsupportsTypeError(type: string): Error {
  return new Error(`Unsupports type "${type}"`)
}

function makeUnknownYargsTypeError(yargsType: YargsType): Error {
  return new Error(`Unknown yargsType "${yargsType}"`)
}

function getLastJSDoc(node: JSDocableNode): JSDoc | null{
  const jsdocs = node.getJsDocs()
  const len = jsdocs.length
  if(0 === len) return null
  return jsdocs[len - 1]
}

export default function convert(interfaceDecl: InterfaceDeclaration): ts.CallExpression[] {
  const props = transformInterfaceProps(interfaceDecl.getProperties())
  const calls = props.map(([ name, props ]) => {
    const args = render(name, props)
    return renderCallable(args as any)
  })

  return calls
}

function renderCallable(args: ts.Expression[]): ts.CallExpression {
  return ts.createCall(
    ts.createIdentifier('option'),
    undefined,
    args
  )
}

function render(name: string, props: { [key: string]: ts.Node }): [ts.Node, ts.Node] {
  const objects = []
  for (const key in props) {
    if (props.hasOwnProperty(key)) {
      const value = props[key as keyof YargsOptions]
      objects.push(
        ts.createPropertyAssignment(
          ts.createIdentifier(key),
          value as ts.Expression
        )
      )
    }
  }

  return [
    ts.createStringLiteral(name),
    ts.createObjectLiteral(
      objects,
      true
    )
  ]
}

function transformInterfaceProps(props: PropertySignature[]): [ string, { [key: string]: ts.Node } ][] {
  return props.map(prop => {
    const name: string = prop.getName()
    
    const type = prop.getType()
    const yargsType = transformYargsType(mapToYargsType(type))

    const jsdoc: JSDoc | null = getLastJSDoc(prop)
    if(null === jsdoc) return [ name, { ...yargsType } ]

    return [ name, { ...yargsType, ...transformJSDoc(jsdoc, type) } ]
  })
}

function transformJSDoc(jsdoc: JSDoc, type: Type): { [key: string]: ts.Node } {
  const props = transformJSDocTag(jsdoc.getTags(), type)
  const comment = jsdoc.getComment()
  if(undefined === comment) return { ...props }
  return { ...props, [YargsControlledTag.Description]: ts.createLiteral(comment) }
}

function transformJSDocTag(tags: JSDocTag[], _type: Type): { [key: string]: ts.Node } {
  return tags.reduce<{ [key: string]: ts.Node }>((acc, tag) => {
    const text = tag.getText()
    const comment = tag.getComment()
    const key: string = text.replace(/^@/, ``).trim()

    switch(key) {
      case YargsSupportedTag.Alias: {
        if(undefined === comment) break
        acc[YargsSupportedTag.Alias] = ts.createLiteral(comment)
        break
      }

      case YargsSupportedTag.Default: {
        if(undefined === comment) break
        acc[YargsSupportedTag.Default] = parseExprStmt(comment)
        break
      }

      case YargsSupportedTag.DemandOption: {
        acc[YargsSupportedTag.DemandOption] = ts.createTrue()
        break
      }

      default: {
        const warning: string = YargsControlledTags.includes(key) 
          ? makeUseControlledTagWarning(key)
          : makeUnUseSupportedTagWarning(key)
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
