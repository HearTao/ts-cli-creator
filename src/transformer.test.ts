import * as vm from 'vm'
import { Project, ts, SourceFile, printNode, FunctionDeclaration, ParameterDeclaration } from 'ts-morph'
import { transformCommand, transformOption, makeUnsupportsTypeError, parseExprStmt, makeCommandTypeExpression, getJSDocTags, getJSDoc, getJSDocTag, makeCommandDescriptionExpression, makeCommandProperties } from './transformer'
import { generateCallableChain } from './generate'
import * as yargs from 'yargs'


describe(`transformCommand()`, () => {
  describe(`makeCommandTypeExpression()`, () => {
    test(`string, number, boolean`, () => {
      const code: string = `function(foo: string) {}`
      const param: ParameterDeclaration = getFunctionParameterDecl(code)
      const actual = makeCommandTypeExpression(param)
      expect(actual).toEqual({ type: ts.createStringLiteral(`string`) })
    })

    test(`no type or any type`, () => {
      const code: string = `function(foo) {}`
      const param: ParameterDeclaration = getFunctionParameterDecl(code)
      const actual = makeCommandTypeExpression(param)
      expect(actual).toEqual({ type: ts.createStringLiteral(`string`) })
    })

    test.skip(`enmu type`, () => {
      const code: string = `enum E { A = 'a', B = 'b' }; function(foo: E) {}`
      const param: ParameterDeclaration = getFunctionParameterDecl(code)
      const actual = makeCommandTypeExpression(param)
      expect(actual).toEqual({ type: ts.createIdentifier(`E`), chooise: [ `a`, `b` ] })
    })

    test(`unsupported type`, () => {
      const code: string = `function(foo: Date) {}`
      const param: ParameterDeclaration = getFunctionParameterDecl(code)
      const actual = () => makeCommandTypeExpression(param)
      expect(actual).toThrowError(makeUnsupportsTypeError(`positional`, `Date`))
    })
  })


  describe(`makeCommandDescriptionExpression()`, () => {
    test(`with description`, () => {
      const code = `/** @param {string} foo - desc for foo */function(foo) {}`
      const param = getFunctionParameterDecl(code)
      const actual = makeCommandDescriptionExpression(param)
      expect(actual).toEqual({ description: ts.createStringLiteral(`desc for foo`) })
    })

    test(`no description`, () => {
      const code = `/** @param {string} foo */function(foo) {}`
      const param = getFunctionParameterDecl(code)
      const actual = makeCommandDescriptionExpression(param)
      expect(actual).toEqual({})
    })

    test(`no @param tag`, () => {
      const code = `function(foo) {}`
      const param = getFunctionParameterDecl(code)
      const actual = makeCommandDescriptionExpression(param)
      expect(actual).toEqual({})
    })
  })

  describe(`makeCommandProperties()`, () => {
    test(`single param`, () => {
      const code = `\
/** 
 * @param {string} foo - desc for foo 
 */
function(foo) {}`
      const func = getFunctionDecl(code)
      const actual = makeCommandProperties(func.getParameters())
      expect(actual).toEqual([
        {
          name: `foo`,
          properties: {
            type: ts.createStringLiteral(`string`),
            description: ts.createStringLiteral(`desc for foo`)
          }
        }
      ])
    })

    test(`multi params`, () => {
      const code = `\
/** 
 * @param {string} foo - desc for foo 
 * @param bar 
 */
function(foo, bar: number) {}`
      const func = getFunctionDecl(code)
      const actual = makeCommandProperties(func.getParameters())
      expect(actual).toEqual([
        { 
          name: `foo`,
          properties: {
            type: ts.createStringLiteral(`string`),
            description: ts.createStringLiteral(`desc for foo`)
          }
        },
        { 
          name: `bar`,
          properties: {
            type: ts.createStringLiteral(`number`)
          }
        }
      ])
    })
  })
})

describe(`convert() types`, () => {
  test(`string`, () => {
    const code: string = `interface Options { foo: string }`
    expect(printOption(code)).toMatchSnapshot()
  })
  
  test(`number`, () => {
    const code: string = `interface Options { foo: number }`
    expect(printOption(code)).toMatchSnapshot()
  })

  test(`boolean`, () => {
    const code: string = `interface Options { foo: boolean }`
    expect(printOption(code)).toMatchSnapshot()
  })

  test(`string[]`, () => {
    const code: string = `interface Options { foo: string[] }`
    expect(printOption(code)).toMatchSnapshot()
  })

  test(`Array<string>`, () => {
    const code: string = `interface Options { foo: Array<string> }`
    expect(printOption(code)).toMatchSnapshot()
  })

  test(`number[]`, () => {
    const code: string = `interface Options { foo: number[] }`
    expect(printOption(code)).toMatchSnapshot()
  })

  test(`Array<number>`, () => {
    const code: string = `interface Options { foo: Array<number> }`
    expect(printOption(code)).toMatchSnapshot()
  })

  test(`boolean[]`, () => {
    const code: string = `interface Options { foo: boolean[] }`
    expect(printOption(code)).toMatchSnapshot()
  })

  test(`Array<boolean>`, () => {
    const code: string = `interface Options { foo: Array<boolean> }`
    expect(printOption(code)).toMatchSnapshot()
  })

  test(`enum`, () => {
    const code: string = `\
enum E { A = 'a', B = 'b' }
interface Options { foo: E }
`
    expect(printOption(code)).toMatchSnapshot()
  })

  test(`mulit properties`, () => {
    const code: string = `\
enum E { A = 'a', B = 'b' }
interface Options { foo: E, bar: string, baz: boolean[] }
`
    expect(printOption(code)).toMatchSnapshot()
  })

  test(`unsupports type error`, () => {
    const code: string = `interface Options { foo: Date }`
    expect(() => runOption(code)).toThrowError(makeUnsupportsTypeError(`option`, `Date`))
  })
})

describe(`convert() yargs test`, () => {
  test(`single option`, () => {
    const code: string = `interface Options { foo: string }`
    expect(
      runYargs(code, '--foo bar')
    ).toMatchObject({ foo: `bar` })
  })

  test(`mulit options`, () => {
    const code: string = `interface Options { foo: string, bar: number }`
    expect(
      runYargs(code, '--foo bar --bar 42')
    ).toMatchObject({ foo: `bar`, bar: 42 })
  })

  test(`enum option`, () => {
    const code: string = `\
enum E { A = 'foo', B = 'bar' }
interface Options { e: E }`
    expect(
      runYargs(code, '--e foo', code => `\
var E;
(function (E) {
    E["A"] = "foo";
    E["B"] = "bar";
})(E || (E = {}));

${code}
`)
    ).toMatchObject({ e: `foo` })
  })
})

describe(`alias option`, () => {
  test(`@alias`, () => {
    const code: string = `\
interface Options {
  /**@alias f */
  foo: string
}
`
    expect(printOption(code)).toMatchSnapshot()
  })
})

describe(`default value`, () => {
  test(`@default string`, () => {
    const code: string = `\
interface Options {
  /**@default "bar" */
  foo: string
}
`
    expect(printOption(code)).toMatchSnapshot()
  })

  test(`@default number`, () => {
    const code: string = `\
interface Options {
  /**@default 42 */
  foo: number
}
`
    expect(printOption(code)).toMatchSnapshot()
  })

  test(`@default boolean`, () => {
    const code: string = `\
interface Options {
  /**@default true */
  foo: boolean
}
`
    expect(printOption(code)).toMatchSnapshot()
  })

  test(`@default string[]`, () => {
    const code: string = `\
interface Options {
  /**@default ["a", 'b'] */
  foo: string[]
}
`
    expect(printOption(code)).toMatchSnapshot()
  })

  test(`@default number[]`, () => {
    const code: string = `\
interface Options {
  /**@default [1, 2, 3] */
  foo: number[]
}
`
    expect(printOption(code)).toMatchSnapshot()
  })

  test(`@default boolean[]`, () => {
    const code: string = `\
interface Options {
  /**@default [true, false] */
  foo: boolean[]
}
`
    expect(printOption(code)).toMatchSnapshot()
  })

  test(`@default enum`, () => {
    const code: string = `\
enum E { A = 'a', B = 'b' }
interface Options {
  /**@default E.A */
  foo: E
}
`
    expect(printOption(code)).toMatchSnapshot()
  })
})

describe(`description option`, () => {
  test(`@description`, () => {
    const code: string = `\
interface Options {
  /** description */
  foo: string
}
`
    expect(printOption(code)).toMatchSnapshot()
  })
})

describe(`demandOption option`, () => {
  test(`@demandOption`, () => {
    const code: string = `\
interface Options {
  /**@demandOption */
  foo: string
}
`
    expect(printOption(code)).toMatchSnapshot()
  })

  test(`@required`, () => {
    const code: string = `\
interface Options {
  /**@required */
  foo: string
}
`
    expect(printOption(code)).toMatchSnapshot()
  })
})

describe(`parseExprStmt()`, () => {
  test(`string`, () => {
    const code = `'foo'`
    const node = parseExprStmt(code)
    const result = printNode(node)
    expect(result).toEqual(`"foo"`)
  })

  test(`string[]`, () => {
    const code = `['foo', 'bar']`
    const node = parseExprStmt(code)
    const result = printNode(node)
    expect(result).toEqual(`["foo", "bar"]`)
  })

  test(`enum`, () => {
    const code = `E.A`
    const node = parseExprStmt(code)
    const result = printNode(node)
    expect(result).toEqual(`E.A`)
  })
})


// #region helpers

describe(`getJSDoc()`, () => {
  test(`undefined`, () => {
    const code: string = `function(){}`
    const node: FunctionDeclaration = getFunctionDecl(code)
    const actual = getJSDoc(node)
    expect(actual).toBeUndefined()
  })

  test(`not undefined`, () => {
    const code: string = `/** foo */function(){}`
    const node: FunctionDeclaration = getFunctionDecl(code)
    const actual = getJSDoc(node)
    expect(actual).not.toBeUndefined()
  })
})

describe(`getJSDocTags()`, () => {
  test(`undefined`, () => {
    const code: string = `function(){}`
    const node: FunctionDeclaration = getFunctionDecl(code)
    const jsdoc = getJSDoc(node)
    const actual = getJSDocTags(jsdoc, `foo`)
    expect(actual).toEqual([])
  })

  test(`string`, () => {
    const code: string = `/** @foo */function(){}`
    const node: FunctionDeclaration = getFunctionDecl(code)
    const jsdoc = getJSDoc(node)
    if(!jsdoc) throw 42
    const actual = getJSDocTags(jsdoc, `foo`)
    expect(actual.length).toEqual(1)
  })

  test(`string, same tag`, () => {
    const code: string = `\
/** 
 * @foo 
 * @foo
 */function(){}`
    const node: FunctionDeclaration = getFunctionDecl(code)
    const jsdoc = getJSDoc(node)
    if(!jsdoc) throw 42
    const actual = getJSDocTags(jsdoc, `foo`)
    expect(actual.length).toEqual(2)
  })

  test(`RegExp`, () => {
    const code: string = `\
/** 
 * @foo 
 * @bar
 */function(){}`
    const node: FunctionDeclaration = getFunctionDecl(code)
    const jsdoc = getJSDoc(node)
    if(!jsdoc) throw 42
    const actual = getJSDocTags(jsdoc, /(foo|bar)/)
    expect(actual.length).toEqual(2)
  })

  test(`function`, () => {
    const code: string = `\
/** 
 * @foo 
 */function(){}`
    const node: FunctionDeclaration = getFunctionDecl(code)
    const jsdoc = getJSDoc(node)
    if(!jsdoc) throw 42
    const actual = getJSDocTags(jsdoc, name => name === `foo`)
    expect(actual.length).toEqual(1)
  })
})

describe(`getJSDocTag()`, () => {
  test(`undefiend`, () => {
    const code: string = `function(){}`
    const node: FunctionDeclaration = getFunctionDecl(code)
    const jsdoc = getJSDoc(node)
    const actual = getJSDocTag(jsdoc, `foo`)
    expect(actual).toEqual(undefined)
  })

  test(`first`, () => {
    const code: string = `
/**
 * @foo bar
 * @foo baz
 */
function(){}`
    const node: FunctionDeclaration = getFunctionDecl(code)
    const jsdoc = getJSDoc(node)
    const actual = getJSDocTag(jsdoc, `foo`)
    expect(actual!.getComment()).toEqual(`bar`)
  })

  test(`last`, () => {
    const code: string = `
/**
 * @foo bar
 * @foo baz
 */
function(){}`
    const node: FunctionDeclaration = getFunctionDecl(code)
    const jsdoc = getJSDoc(node)
    const actual = getJSDocTag(jsdoc, `foo`, -1)
    expect(actual!.getComment()).toEqual(`baz`)
  })
})

// #endregion


function runOption(code: string): [ ts.CallExpression[], SourceFile ] {
  const project = new Project({
    skipFileDependencyResolution: true
  })
  const sourceFile = project.createSourceFile(`tmp.ts`, code)
  return [ transformOption(sourceFile.getInterfaces()[0]), sourceFile ]
}

function getFunctionDecl(code: string): FunctionDeclaration {
  const project = new Project({
    skipFileDependencyResolution: true
  })
  const sourceFile = project.createSourceFile(`tmp.ts`, code)
  return sourceFile.getFunctions()[0]
}

function getFunctionParameterDecl(code: string, index: number = 0): ParameterDeclaration {
  const decl = getFunctionDecl(code)
  const params = decl.getParameters()
  return params[index]
}

function runCommand(code: string): [ ts.CallExpression[], SourceFile ] {
  const project = new Project({
    skipFileDependencyResolution: true
  })
  const sourceFile = project.createSourceFile(`tmp.ts`, code)
  return [ transformCommand(sourceFile.getFunctions()[0]).calls, sourceFile ]
}

export function printCommand(code: string): string {
  const [ nodes ] = runCommand(code)
  return nodes.map(node => printNode(node)).join('\n')
}

export function print(nodes: any): string {
  const arr = Array.isArray(nodes) ? nodes : [ nodes ]
  return arr.map(node => printNode(node)).join(`\n`)
}

function printOption(code: string): string {
  const [ nodes ] = runOption(code)
  return nodes.map(node => printNode(node)).join('\n')
}

function runYargs(code: string, args: string = '', override?: (code: string) => string): yargs.Arguments {
  const out = vm.runInThisContext(makeCode(code, args))(require)
  console.log(out)
  return out

  function makeCode(code: string, args: string): string {
    const [ nodes, sourceFile ] = runOption(code)

    const callableChainNodes = generateCallableChain(
      nodes, 
      ts.createCall(
        ts.createIdentifier('require'), 
        undefined, [
          ts.createStringLiteral('yargs')
        ]
      )
    )
    
    const constructNode = 
    ts.createCall(
      ts.createPropertyAccess(
        callableChainNodes,
        ts.createIdentifier('parse')
      ),
      undefined,
      [
        ts.createArrayLiteral(
          args.split(' ')
            .map(arg => arg.trim()).filter(Boolean)
            .map(arg => ts.createStringLiteral(arg)),
          false
        )
      ]
    )
    
    const bodyCode: string = ts.createPrinter().printNode(ts.EmitHint.Unspecified, constructNode, sourceFile as any)
    const resultCode: string = `(require)=>{\n return ${bodyCode}\n}`
    const out: string = `function` === typeof override ? override(resultCode) : resultCode
    console.log(out)
    return out
  }
}
