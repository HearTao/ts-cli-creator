import { ts, printNode } from 'ts-morph'
import * as prettier from 'prettier'

export function generateCallableChain(calls: ts.CallExpression[], expr: ts.Expression): ts.CallExpression {
  return calls.reverse().reduce((acc: any, call: any) => {
    return (expr: ts.Expression) => replaceCallableProperty(acc(call), expr)
  }, (a: any) => a)(expr)
}

function replaceCallableProperty(call: ts.CallExpression, expr: ts.Expression): ts.CallExpression {
  return ts.createCall(
    ts.createPropertyAccess(
      expr,
      call.expression as ts.Identifier
    ),
    call.typeArguments,
    call.arguments
  )
}

const DEFAULT_NAME: string = `yargs`

export interface GenerateOptions {
  optionCalls: ts.CallExpression[]
  name: string
  strict: boolean,
  help: boolean
}

const DEFAULT_GENERATE_OPTIONS: GenerateOptions = {
  optionCalls: [],
  name: DEFAULT_NAME,
  strict: true,
  help: true
}

export default function generate(options: Partial<GenerateOptions> = {}): ts.Node[] {
  const { optionCalls, name, strict, help } = { ...DEFAULT_GENERATE_OPTIONS, ...options }
  
  const acc: ts.CallExpression[] = []

  if(strict) {
    acc.push(ts.createCall(ts.createIdentifier('strict'), undefined, []))
  }
  
  if(0 !== optionCalls.length) {
    optionCalls.forEach(call => acc.push(call))
  }
  
  if(help) {
    acc.push(ts.createCall(ts.createIdentifier('help'), undefined, []))
    acc.push(ts.createCall(ts.createIdentifier('alias'), undefined, [
      ts.createStringLiteral('help'),
      ts.createStringLiteral('h')
    ]))
  }

  const callableChainNodes = generateCallableChain(acc, ts.createIdentifier(name))
  
  const yargsNode =
  ts.createVariableStatement(
    undefined,
    ts.createVariableDeclarationList(
      [
        ts.createVariableDeclaration(
          ts.createIdentifier('args'),
          ts.createTypeReferenceNode(
            ts.createQualifiedName(
              ts.createIdentifier(`yargs`),
              ts.createIdentifier(`Arguments`)
            ),
            [
              ts.createTypeReferenceNode(ts.createIdentifier('Options'), undefined)
            ]
          ),
          ts.createPropertyAccess(
            callableChainNodes,
            ts.createIdentifier(`argv`)
          )
        )
      ], ts.NodeFlags.Const
    )
  )

  const deconstructNode =
  ts.createVariableStatement(
    undefined,
    ts.createVariableDeclarationList(
      [
        ts.createVariableDeclaration(
          ts.createObjectBindingPattern(
            [
              ts.createBindingElement(
                undefined,
                undefined,
                ts.createIdentifier('_'),
                undefined
              ),
              ts.createBindingElement(
                undefined,
                undefined,
                ts.createIdentifier('$0'),
                undefined
              ),
              ts.createBindingElement(
                ts.createToken(ts.SyntaxKind.DotDotDotToken),
                undefined,
                ts.createIdentifier('options'),
                undefined
              )
            ]
          ),
          undefined,
          ts.createIdentifier('args')
        )
      ],
      ts.NodeFlags.Const
    )
  )

  const applyCommandNode =
  ts.createExpressionStatement(
    ts.createCall(ts.createIdentifier('command'), undefined, [
      ts.createIdentifier('options')
    ])
  )

  return generateWrapper([ yargsNode, deconstructNode, applyCommandNode ])

  // return yargsNode
}

export function render(nodes: ts.Node[]) {
  const code = nodes.map(node => printNode(node)).join(`\n`)
  return prettier.format(code, { parser: 'typescript' })
}

export function generateWrapper(body: ts.Statement[]): ts.Node[] {
  return [
    ts.createImportDeclaration(
      undefined,
      undefined,
      ts.createImportClause(
        undefined,
        ts.createNamespaceImport(
          ts.createIdentifier('yargs')
        ),
      ),
      ts.createStringLiteral('yargs')
    ),
    
    ts.createImportDeclaration(
      undefined,
      undefined,
      ts.createImportClause(
        ts.createIdentifier('command'), 
        ts.createNamedImports(
          [
            ts.createImportSpecifier(
              undefined,
              ts.createIdentifier(`Options`)
            )
          ]
        )
      ),
      ts.createStringLiteral('./index')
    ),

    ts.createFunctionDeclaration(
      undefined,
      [
        ts.createModifier(ts.SyntaxKind.ExportKeyword),
        ts.createModifier(ts.SyntaxKind.DefaultKeyword),
      ],
      undefined,
      ts.createIdentifier('main'),
      undefined,
      [],
      ts.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword),
      ts.createBlock(body, true)
    )
  ]
}
