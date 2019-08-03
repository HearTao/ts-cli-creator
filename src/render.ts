import { ts } from 'ts-morph'
import { TransformResult } from './transformer'

const CLI_LIB_NAME: string = `yargs`
const FUNCTION_NAME: string = `main`

export interface RenderOptions {
  lib: string
  strict: boolean,
  help: boolean,
  helpAlias: boolean,
  version: boolean
}

const DEFAULT_RENDER_OPTIONS: RenderOptions = {
  lib: CLI_LIB_NAME,
  strict: true,
  help: true,
  helpAlias: true,
  version: true
}

export default function render(result: TransformResult, options: Partial<RenderOptions> = {}): ts.Node[] {
  const { lib, strict, help, helpAlias, version } = { ...DEFAULT_RENDER_OPTIONS, ...options }
  const acc = []

  if(strict) acc.push(ts.createCall(ts.createIdentifier('strict'), undefined, []))
  acc.push(makeCommandNode(result))
  if(help) acc.push(ts.createCall(ts.createIdentifier('help'), undefined, []))
  if(helpAlias) acc.push(ts.createCall(ts.createIdentifier('alias'), undefined, [ ts.createStringLiteral('help'), ts.createStringLiteral('h') ]))
  if(version) acc.push(ts.createCall(ts.createIdentifier('version'), undefined, []))

  const callableChainNodes = generateCallableChain(acc, ts.createIdentifier(lib))

  const yargsNode =
  ts.createExpressionStatement(
    ts.createPropertyAccess(
      callableChainNodes,
      ts.createIdentifier(`argv`)
    )
  )

  return makeWrapper([ yargsNode ], lib)
}

// #region wrapper

export function makeWrapper(body: ts.Statement[] = [], lib: string = CLI_LIB_NAME): ts.Node[] {
  return [
    makeLibImportDeclarationNode(lib, `yargs`),
    makeCommandImportDeclarationNode(`command`, `./`),
    makeWrapperFunctionDeclaration(body)
  ]
}

export function makeLibImportDeclarationNode(exporter: string, path: string): ts.ImportDeclaration {
  return ts.createImportDeclaration(
    undefined,
    undefined,
    ts.createImportClause(
      undefined,
      ts.createNamespaceImport(
        ts.createIdentifier(exporter)
      ),
    ),
    ts.createStringLiteral(path)
  )
}

export function makeCommandImportDeclarationNode(exporter: string, path: string, namedExporter: string[] = []): ts.ImportDeclaration {
  return ts.createImportDeclaration(
    undefined,
    undefined,
    ts.createImportClause(
      ts.createIdentifier(exporter),

      0 === namedExporter.length ? undefined : 
      ts.createNamedImports(
        namedExporter.map(name => {
          return ts.createImportSpecifier(
            undefined,
            ts.createIdentifier(name)
          )
        })
      )

    ),
    ts.createStringLiteral(path)
  )
}

export function makeWrapperFunctionDeclaration(body: ts.Statement[] = [], name: string = FUNCTION_NAME): ts.FunctionDeclaration {
  return ts.createFunctionDeclaration(
    undefined,
    [
      ts.createModifier(ts.SyntaxKind.ExportKeyword),
      ts.createModifier(ts.SyntaxKind.DefaultKeyword),
    ],
    undefined,
    ts.createIdentifier(name),
    undefined,
    [],
    ts.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword),
    ts.createBlock(body, true)
  )
}

// #endregion

// #region commander

function makeCommandNode(result: TransformResult): ts.CallExpression {
  const commandNode = 
  ts.createCall(
    ts.createIdentifier('command'),
    undefined,
    [
      makePositionalCommandString(result),
      result.description,
      makeBuilder(result),
      makeHandler(result)
    ]
  )

  return commandNode
}

function makePositionalCommandString(result: TransformResult): ts.StringLiteral {
  const { positionals, options } = result
  const acc: string[] = [`$0`]
  positionals.forEach(([ name ]) => acc.push(`<${name}>`))
  if(0 !== options.length) acc.push(`[options]`)
  return ts.createStringLiteral(acc.join(` `))
}

function makeBuilder(result: TransformResult): ts.ArrowFunction {
  const { positionals, options } = result
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

function makeHandler(result: TransformResult): ts.ArrowFunction {
  const { positionals, options } = result
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
              ...makePositionalBindingNodes(),
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

// #encregion


// #region helper

export function generateCallableChain(calls: ts.CallExpression[], expr: ts.Expression): ts.CallExpression {
  return calls.reverse().reduce((acc, call) => {
    return expr => replaceCallableProperty(acc(call), expr)
  }, (a: ts.Expression) => a as ts.CallExpression)(expr)
}

export function replaceCallableProperty(call: ts.CallExpression, expr: ts.Expression): ts.CallExpression {
  return ts.createCall(
    ts.createPropertyAccess(
      expr,
      call.expression as ts.Identifier
    ),
    call.typeArguments,
    call.arguments
  )
}

// #endregion
