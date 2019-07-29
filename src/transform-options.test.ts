import * as vm from 'vm'
import { Project, ts, SourceFile } from 'ts-morph'
import convert, { makeUnsupportsTypeError } from './transform-option'
import { generateCallableChain } from './generate'
import * as yargs from 'yargs'

describe(`convert() types`, () => {
  test(`string`, () => {
    const code: string = `interface Options { foo: string }`
    expect(print(code)).toMatchSnapshot()
  })
  
  test(`number`, () => {
    const code: string = `interface Options { foo: number }`
    expect(print(code)).toMatchSnapshot()
  })

  test(`boolean`, () => {
    const code: string = `interface Options { foo: boolean }`
    expect(print(code)).toMatchSnapshot()
  })

  test(`string[]`, () => {
    const code: string = `interface Options { foo: string[] }`
    expect(print(code)).toMatchSnapshot()
  })

  test(`Array<string>`, () => {
    const code: string = `interface Options { foo: Array<string> }`
    expect(print(code)).toMatchSnapshot()
  })

  test(`number[]`, () => {
    const code: string = `interface Options { foo: number[] }`
    expect(print(code)).toMatchSnapshot()
  })

  test(`Array<number>`, () => {
    const code: string = `interface Options { foo: Array<number> }`
    expect(print(code)).toMatchSnapshot()
  })

  test(`boolean[]`, () => {
    const code: string = `interface Options { foo: boolean[] }`
    expect(print(code)).toMatchSnapshot()
  })

  test(`Array<boolean>`, () => {
    const code: string = `interface Options { foo: Array<boolean> }`
    expect(print(code)).toMatchSnapshot()
  })

  test(`enum`, () => {
    const code: string = `\
enum E { A = 'a', B = 'b' }
interface Options { foo: E }
`
    expect(print(code)).toMatchSnapshot()
  })

  test(`mulit properties`, () => {
    const code: string = `\
enum E { A = 'a', B = 'b' }
interface Options { foo: E, bar: string, baz: boolean[] }
`
    expect(print(code)).toMatchSnapshot()
  })

  test(`unsupports type`, () => {
    const code: string = `interface Options { foo: Date }`
    expect(() => run(code)).toThrowError(makeUnsupportsTypeError(`Date`))
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
      runYargs(code, '--e foo')
    ).toMatchObject({ e: `foo` })
  })
})

function run(code: string): [ ts.CallExpression[], SourceFile ] {
  const project = new Project({
    skipFileDependencyResolution: true
  })
  const sourceFile = project.createSourceFile(`tmp.ts`, code)
  return [ convert(sourceFile.getInterfaces()[0]), sourceFile ]
}

function print(code: string): string {
  const [ nodes, sourceFile ] = run(code)
  return ts.createPrinter().printList(ts.ListFormat.MultiLine, nodes as any, sourceFile as any)
}

function runYargs(code: string, args: string = ''): yargs.Arguments {
  const out = vm.runInThisContext(makeCode(code, args))(require)
  console.log(out)
  return out

  function makeCode(code: string, args: string): string {
    const [ nodes, sourceFile ] = run(code)

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
    console.log(resultCode)
    return resultCode
  }
}
