import { SourceFile, ts, JSDoc, JSDocTag, PropertySignature, InterfaceDeclaration, JSDocableNode } from 'ts-morph'

// enum YargsType {
//   String = 'string',
//   Number = 'number',
//   Boolean = 'boolean'
//   /**@todo Count = 'count'*/ 
// }

const JSDOCTAG_OPTIONS: string = `@cliOptions`

function filterInterfaceByJSDos(interfaces: InterfaceDeclaration[]): InterfaceDeclaration | undefined {
  return interfaces.find(decl => {
    const jsdoc = getLastJSDoc(decl)
    if(null === jsdoc) return false
    return Boolean(getTag(jsdoc, tag => JSDOCTAG_OPTIONS === tag.getText().trim()))
  })
}

function getTag(jsdoc: JSDoc, predicate: (tag: JSDocTag) => boolean): JSDocTag | undefined {
  return jsdoc.getTags().find(tag => predicate(tag))
}

function getLastJSDoc(node: JSDocableNode): JSDoc | null{
  const jsdocs = node.getJsDocs()
  const len = jsdocs.length
  if(0 === len) return null
  return jsdocs[len - 1]
}

export default function convert(sourceFile: SourceFile): ts.Node | null {
  const interfaces = sourceFile.getInterfaces()
  const optionsInterface = filterInterfaceByJSDos(interfaces)
  if(undefined === optionsInterface) return null

  const props = transformInterfaceProps(optionsInterface.getProperties())
  const calls = props.map(([ name, props ]) => {
    const args = render(name, props)
    return renderCallable(args as any)
  })

  return renderCallableChain(ts.createIdentifier(`yargs`), calls)
}

function renderCallableChain(iden: ts.Identifier, calls: ts.CallExpression[]): ts.Node {
  return calls.reverse().reduce((acc: any, call: any) => {
    const curr = acc(call)
    return (next: any) => ts.createCall(
      ts.createPropertyAccess(
        next,
        curr.expression as any
      ),
      undefined,
      curr.arguments
    )
  }, (a: any) => a)(iden)
}

function renderCallable(args: ts.Expression[]): ts.CallExpression {
  return ts.createCall(
    ts.createIdentifier('option'),
    undefined,
    args
  )
}

function render(name: string, props: { [key: string]: string }): [ts.Node, ts.Node] {
  const objects = []
  for (const key in props) {
    if (props.hasOwnProperty(key)) {
      const value = props[key]
      objects.push(
        ts.createPropertyAssignment(
          ts.createIdentifier(key),
          ts.createStringLiteral(value)
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

function transformInterfaceProps(props: PropertySignature[]): [ string, { [key: string]: string } ][] {
  return props.map(prop => {
    const name: string = prop.getName()
    const type: string = prop.getType().getText()

    const jsdoc = getLastJSDoc(prop)
    if(null === jsdoc) return [ name, { type }]
    const props = transformJSDoc(jsdoc)
    return [ name, { ...props, type } ]
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
    acc[text.replace(/^@/, ``).trim()] = comment
    return acc
  }, Object.create(null))
}
