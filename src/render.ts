import { ts } from 'ts-morph'
import { TransformResult } from './transformer'

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
  name: string
  strict: boolean,
  help: boolean
}

const DEFAULT_GENERATE_OPTIONS: GenerateOptions = {
  name: DEFAULT_NAME,
  strict: true,
  help: true
}

export default function render(result: TransformResult, options: Partial<GenerateOptions> = {}): ts.Node[] {
  const { name, strict, help } = { ...DEFAULT_GENERATE_OPTIONS, ...options }
  
  const acc: ts.CallExpression[] = []

  if(strict) {
    acc.push(ts.createCall(ts.createIdentifier('strict'), undefined, []))
  }
  
  acc.push(makeCommandNode(result))
  
  if(help) {
    acc.push(ts.createCall(ts.createIdentifier('help'), undefined, []))
    acc.push(ts.createCall(ts.createIdentifier('alias'), undefined, [
      ts.createStringLiteral('help'),
      ts.createStringLiteral('h')
    ]))
  }

  const yargsIdenNode = 
  ts.createParen(
    ts.createAsExpression(
      ts.createIdentifier(name),
      ts.createTypeReferenceNode(
        ts.createQualifiedName(
          ts.createIdentifier(name),
          ts.createIdentifier('Argv')
        ),
        [
          ts.createTypeReferenceNode(
            ts.createIdentifier('Options'),
            undefined
          )
        ]
      )
    )
  )

  const callableChainNodes = generateCallableChain(acc, yargsIdenNode)
  
  // const yargsNode =
  // ts.createVariableStatement(
  //   undefined,
  //   ts.createVariableDeclarationList(
  //     [
  //       ts.createVariableDeclaration(
  //         ts.createIdentifier('args'),
  //         ts.createTypeReferenceNode(
  //           ts.createQualifiedName(
  //             ts.createIdentifier(`yargs`),
  //             ts.createIdentifier(`Arguments`)
  //           ),
  //           [
  //             ts.createTypeReferenceNode(ts.createIdentifier('Options'), undefined)
  //           ]
  //         ),
  //         ts.createPropertyAccess(
  //           callableChainNodes,
  //           ts.createIdentifier(`argv`)
  //         )
  //       )
  //     ],
  //     ts.NodeFlags.Const
  //   )
  // )
  const yargsNode =
  ts.createExpressionStatement(
    ts.createPropertyAccess(
      callableChainNodes,
      ts.createIdentifier(`argv`)
    )
  )

  return makeWrapper([ yargsNode ])

  // return yargsNode
}

export function makeWrapper(body: ts.Statement[]): ts.Node[] {
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


function makeCommandNode(result: TransformResult): ts.CallExpression {
  const { description, positionals, options } = result
  
  const commandNode = 
  ts.createCall(
    ts.createIdentifier('command'),
    undefined,
    [
      makePositionalCommandString(),
      description,
      makeBuilder(),
      makeHandler()
    ]
  )

  function makePositionalCommandString(): ts.StringLiteral {
    const acc: string[] = [`$0`]
    positionals.forEach(([ name ]) => acc.push(`<${name}>`))
    return ts.createStringLiteral(acc.join(` `))
  }

  function makeBuilder(): ts.ArrowFunction {
    const acc: ts.CallExpression[] = []
    positionals.forEach(([, call ]) => acc.push(call))
    options.forEach(call => acc.push(call))

    const callNodes = generateCallableChain(acc, ts.createIdentifier(`yargs`))

    const node = 
    ts.createArrowFunction(
      undefined,
      undefined,
      [
        ts.createParameter(
          undefined,
          undefined,
          undefined,
          ts.createIdentifier('yargs'),
          undefined,
          undefined,
          undefined
        )
      ],
      undefined,
      ts.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
      ts.createBlock(
        [
          ts.createReturn(
            callNodes
          )
        ], 
        true
      )
    )
    
    return node
  }

  function makeHandler(): ts.ArrowFunction {
    const acc: ts.CallExpression[] = []
    positionals.forEach(([, call ]) => acc.push(call))
    options.forEach(call => acc.push(call))

    const iden: ts.Identifier = ts.createIdentifier(`args`)

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
                  ts.createIdentifier(`_`),
                  ts.createArrayBindingPattern(
                    makePositionalBindingNodes()
                  ),
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
      ts.createCall(
        ts.createIdentifier('command'), 
        undefined, 
        [
          ...makePositionalIdentifierNodes(),
          ts.createIdentifier('options')
        ]
      )
    )

    const node = 
    ts.createArrowFunction(
      undefined,
      undefined,
      [
        ts.createParameter(
          undefined,
          undefined,
          undefined,
          iden,
          undefined,
          undefined,
          undefined
        )
      ],
      undefined,
      ts.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
      ts.createBlock(
        [
          deconstructNode,
          applyCommandNode
        ], 
        false
      )
    )

    function makePositionalBindingNodes(): ts.BindingElement[] {
      return positionals.map(([ name ]) => {
        return ts.createBindingElement(
          undefined,
          undefined,
          ts.createIdentifier(name),
          undefined
        )
      })
    }

    function makePositionalIdentifierNodes(): ts.Identifier[] {
      return positionals.map(([ name ]) => {
        return ts.createIdentifier(name)
      })
    }
    
    return node
  }

  return commandNode
}
