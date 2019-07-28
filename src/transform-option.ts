import { ts, JSDoc, JSDocTag, PropertySignature, InterfaceDeclaration, JSDocableNode, Type, Node, EnumDeclaration } from 'ts-morph'
import { Options as YargsOptions } from 'yargs'
// import {} from 'ts-creator'

const enum YargsType {
  String,
  Number,
  Boolean,
  ArrayString,
  ArrayNumber,
  ArrayBoolean,
  /**@todo */Enum
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
  Default = 'default'
}

const YargsSupportedTags: string[] = [
  YargsSupportedTag.Alias,
  YargsSupportedTag.Default
]

type MappedYargsType = 
  | [ YargsType.String, null ]
  | [ YargsType.Number, null ]
  | [ YargsType.Boolean, null ]
  | [ YargsType.ArrayString, null ]
  | [ YargsType.ArrayNumber, null ]
  | [ YargsType.ArrayBoolean, null ]
  | [ YargsType.Enum, EnumDeclaration ]

function mapToYargsType(type: Type): MappedYargsType {
  const text = type.getText()
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

function makeUnsupportsTypeError(type: string): Error {
  return new Error(`Unsupports type "${type}"`)
}

function makeUnknownYargsTypeError(yargsType: YargsType): Error {
  return new Error(`Unknown yargsType "${yargsType}"`)
}

// function getTag(jsdoc: JSDoc, predicate: (tag: JSDocTag) => boolean): JSDocTag | undefined {
//   return jsdoc.getTags().find(tag => predicate(tag))
// }

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
    

    const jsdoc = getLastJSDoc(prop)
    if(null === jsdoc) return [ name, { ...yargsType } ]
    const props = transformJSDoc(jsdoc)
    return [ name, { ...props, ...yargsType } ] as any
  })
}

function transformJSDoc(jsdoc: JSDoc): { [key: string]: string } {
  const props = transformJSDocTag(jsdoc.getTags())
  const comment = jsdoc.getComment()
  if(undefined === comment) return { ...props }
  return { ...props, description: comment }
}

function transformJSDocTag(tags: JSDocTag[]): { [key: string]: string } {
  return tags.reduce((acc, tag) => {
    const text = tag.getText()
    const comment = tag.getComment()
    if(undefined === comment) return
    const key: string = text.replace(/^@/, ``).trim()
    
    if(YargsControlledTags.includes(key)) {
      console.log(makeUseControlledTagError(key))
      return acc
    } else if(!YargsSupportedTags.includes(key)) {
      console.log(makeUnUseSupportedTagError(key))
      return acc
    }
    
    acc[key] = comment
    return acc
  }, Object.create(null))
}

function makeUseControlledTagError(tag: string) {
  return new Error(`Option property "${tag}" was controlled, please remove jsdoc tag "@${tag}"`)
}

function makeUnUseSupportedTagError(tag: string): Error {
  return new Error(`Option property "${tag}" was not supported, please one of "@${YargsSupportedTags.join(', ')}"`)
}
