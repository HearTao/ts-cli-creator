import * as vm from 'vm'
import { Project, ts, SourceFile, printNode } from 'ts-morph'
import convert, { makeUnsupportsTypeError, parseExprStmt } from './transform-option'
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

  test(`unsupports type error`, () => {
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
    expect(print(code)).toMatchSnapshot()
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
    expect(print(code)).toMatchSnapshot()
  })

  test(`@default number`, () => {
    const code: string = `\
interface Options {
  /**@default 42 */
  foo: number
}
`
    expect(print(code)).toMatchSnapshot()
  })

  test(`@default boolean`, () => {
    const code: string = `\
interface Options {
  /**@default true */
  foo: boolean
}
`
    expect(print(code)).toMatchSnapshot()
  })

  test(`@default string[]`, () => {
    const code: string = `\
interface Options {
  /**@default ["a", 'b'] */
  foo: string[]
}
`
    expect(print(code)).toMatchSnapshot()
  })

  test(`@default number[]`, () => {
    const code: string = `\
interface Options {
  /**@default [1, 2, 3] */
  foo: number[]
}
`
    expect(print(code)).toMatchSnapshot()
  })

  test(`@default boolean[]`, () => {
    const code: string = `\
interface Options {
  /**@default [true, false] */
  foo: boolean[]
}
`
    expect(print(code)).toMatchSnapshot()
  })

  test(`@default enum`, () => {
    const code: string = `\
enum E { A = 'a', B = 'b' }
interface Options {
  /**@default E.A */
  foo: E
}
`
    expect(print(code)).toMatchSnapshot()
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
    expect(print(code)).toMatchSnapshot()
  })
})

describe(`demandOption option`, () => {
  test.only(`@demandOption`, () => {
    const code: string = `\
interface Options {
  /**@demandOption */
  foo: string
}
`
    expect(print(code)).toMatchSnapshot()
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


function run(code: string): [ ts.CallExpression[], SourceFile ] {
  const project = new Project({
    skipFileDependencyResolution: true
  })
  const sourceFile = project.createSourceFile(`tmp.ts`, code)
  return [ convert(sourceFile.getInterfaces()[0]), sourceFile ]
}

function print(code: string): string {
  const [ nodes ] = run(code)
  return nodes.map(node => printNode(node)).join('\n')
}

function runYargs(code: string, args: string = '', override?: (code: string) => string): yargs.Arguments {
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
    const out: string = `function` === typeof override ? override(resultCode) : resultCode
    console.log(out)
    return out
  }
}
