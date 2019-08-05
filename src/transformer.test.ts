import * as vm from 'vm'
import * as yargs from 'yargs'
import { Project, ts, SourceFile, printNode, FunctionDeclaration, ParameterDeclaration, InterfaceDeclaration, PropertySignature } from 'ts-morph'
import { transformCommand, transformOption, makeUnsupportsTypeError, parseExprStmt, makeCommandTypeExpression, getJSDocTags, getJSDoc, getJSDocTag, makeCommandDescriptionExpression, makeCommandProperties, getCommandDescription, makeOptionsTypeExpression, makeOptionsDescriptionExpression, makeOptionJSDocTagExpression } from './transformer'
import { generateCallableChain } from './render'


describe(`transformCommand()`, () => {
  describe(`makeCommandTypeExpression()`, () => {
    test(`string, number, boolean`, () => {
      const code: string = `function(foo: string) {}`
      const param: ParameterDeclaration = getFunctionParameterDecl(code)
      const [resolved] = makeCommandTypeExpression(param)
      expect(resolved).toEqual({ type: ts.createStringLiteral(`string`) })
    })

    test(`no type or any type`, () => {
      const code: string = `function(foo) {}`
      const param: ParameterDeclaration = getFunctionParameterDecl(code)
      const [resolved] = makeCommandTypeExpression(param)
      expect(resolved).toEqual({ type: ts.createStringLiteral(`string`) })
    })

    test(`enmu type`, () => {
      const code: string = `enum E { A = 'a', B = 'b' }; function(foo: E) {}`
      const param: ParameterDeclaration = getFunctionParameterDecl(code)
      const [resolved] = makeCommandTypeExpression(param)
      expect(resolved).toEqual({ 
        type: ts.createStringLiteral(`string`), 
        chooise: ts.createArrayLiteral([
          ts.createPropertyAccess(
            ts.createIdentifier(`E`),
            ts.createIdentifier(`A`)
          ),
          ts.createPropertyAccess(
            ts.createIdentifier(`E`),
            ts.createIdentifier(`B`)
          )
        ], false)
      })
    })

    test(`unsupported type`, () => {
      const code: string = `function(foo: Date) {}`
      const param: ParameterDeclaration = getFunctionParameterDecl(code)
      expect(() => makeCommandTypeExpression(param)).toThrowError(makeUnsupportsTypeError(`positional`, `Date`))
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
    test(`single`, () => {
      const code = `\
/** 
 * @param {string} foo - desc for foo 
 */
function(foo) {}`
      const func = getFunctionDecl(code)
      const resolved = makeCommandProperties(func.getParameters())
      expect(resolved).toEqual([
        {
          name: `foo`,
          properties: {
            type: ts.createStringLiteral(`string`),
            description: ts.createStringLiteral(`desc for foo`)
          }
        }
      ])
    })

    test(`multi`, () => {
      const code = `\
/** 
 * @param {string} foo - desc for foo 
 * @param bar 
 */
function(foo, bar: number) {}`
      const func = getFunctionDecl(code)
      const resolved = makeCommandProperties(func.getParameters())
      expect(resolved).toEqual([
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

  describe(`makeCommandDescription()`, () => {
    test(`description`, () => {
      const code = `/** desc */function(){}`
      const resolved = getCommandDescription(getFunctionDecl(code))
      expect(resolved).toEqual(ts.createStringLiteral(`desc`))
    })

    test(`no comment`, () => {
      const code = `function(){}`
      const resolved = getCommandDescription(getFunctionDecl(code))
      expect(resolved).toEqual(ts.createStringLiteral(``))
    })

    test(`comment but no description`, () => {
      const code = `/** @foo */function(){}`
      const resolved = getCommandDescription(getFunctionDecl(code))
      expect(resolved).toEqual(ts.createStringLiteral(``))
    })
  })

  describe(`transformCommand()`, () => {
    test(`simple`, () => {
      const code = `function(){}`
      const resolved = transformCommand(getFunctionDecl(code))
      expect(resolved.description).toEqual(ts.createStringLiteral(''))
      expect(resolved.positionals).toEqual([])
      expect(resolved.options).toEqual([])
    })
  })
})

describe(`transformOptions()`, () => {
  describe(`makeOptionsTypeExpression()`, () => {
    test(`string`, () => {
      const code = `interface Options { foo: string }`
      const prop = getInterfaceProperty(code)
      const resolved = makeOptionsTypeExpression(prop.getType())
      expect(resolved).toEqual({ type: ts.createStringLiteral(`string`) })
    })
    
    test(`number`, () => {
      const code = `interface Options { foo: number }`
      const prop = getInterfaceProperty(code)
      const resolved = makeOptionsTypeExpression(prop.getType())
      expect(resolved).toEqual({ type: ts.createStringLiteral(`number`) })
    })
  
    test(`boolean`, () => {
      const code = `interface Options { foo: boolean }`
      const prop = getInterfaceProperty(code)
      const resolved = makeOptionsTypeExpression(prop.getType())
      expect(resolved).toEqual({ type: ts.createStringLiteral(`boolean`) })
    })
  
    test(`string[]`, () => {
      const code = `interface Options { foo: string[] }`
      const prop = getInterfaceProperty(code)
      const resolved = makeOptionsTypeExpression(prop.getType())
      expect(resolved).toEqual({ type: ts.createStringLiteral(`string`), array: ts.createTrue() })
    })
  
    test(`Array<string>`, () => {
      const code = `interface Options { foo: Array<string> }`
      const prop = getInterfaceProperty(code)
      const resolved = makeOptionsTypeExpression(prop.getType())
      expect(resolved).toEqual({ type: ts.createStringLiteral(`string`), array: ts.createTrue() })
    })

    test(`number[]`, () => {
      const code = `interface Options { foo: number[] }`
      const prop = getInterfaceProperty(code)
      const resolved = makeOptionsTypeExpression(prop.getType())
      expect(resolved).toEqual({ type: ts.createStringLiteral(`number`), array: ts.createTrue() })
    })
  
    test(`boolean[]`, () => {
      const code = `interface Options { foo: boolean[] }`
      const prop = getInterfaceProperty(code)
      const resolved = makeOptionsTypeExpression(prop.getType())
      expect(resolved).toEqual({ type: ts.createStringLiteral(`boolean`), array: ts.createTrue() })
    })
  
    test(`enum`, () => {
      const code = `enum E { A = 'a', B = 'b' }; interface Options { foo: E }`
      const prop = getInterfaceProperty(code)
      const resolved = makeOptionsTypeExpression(prop.getType())
      expect(resolved).toEqual({ 
        type: ts.createStringLiteral(`string`), 
        chooise: ts.createArrayLiteral([
          ts.createPropertyAccess(
            ts.createIdentifier(`E`),
            ts.createIdentifier(`A`)
          ),
          ts.createPropertyAccess(
            ts.createIdentifier(`E`),
            ts.createIdentifier(`B`)
          )
        ], false)
      })
    })
  
    test(`unsupports type error`, () => {
      const code: string = `interface Options { foo: Date }`
      const prop = getInterfaceProperty(code)
      expect(() => makeOptionsTypeExpression(prop.getType())).toThrow()
    })

    test(`unsupports array element type error`, () => {
      const code: string = `interface Options { foo: Date[] }`
      const prop = getInterfaceProperty(code)
      expect(() => makeOptionsTypeExpression(prop.getType())).toThrow()
    })
  })

  describe(`makeOptionsDescriptionExpression()`, () => {
    test(`desc`, () => {
      const code: string = `interface Options { 
/** desc */
foo: string }`
      const decl = getInterfaceProperty(code)
      const resolved = makeOptionsDescriptionExpression(decl)
      expect(resolved).toEqual({ description: ts.createStringLiteral(`desc`) })
    })

    test(`comment no desc`, () => {
      const code: string = `interface Options { 
/** */
foo: string }`
      const decl = getInterfaceProperty(code)
      const resolved = makeOptionsDescriptionExpression(decl)
      expect(resolved).toEqual({ })
    })

    test(`no comment`, () => {
      const code: string = `interface Options { foo: string }`
      const decl = getInterfaceProperty(code)
      const resolved = makeOptionsDescriptionExpression(decl)
      expect(resolved).toEqual({ })
    })
  })
  
  // describe(`convert() yargs test`, () => {
  //   test(`single option`, () => {
  //     const code: string = `interface Options { foo: string }`
  //     expect(
  //       runYargs(code, '--foo bar')
  //     ).toMatchObject({ foo: `bar` })
  //   })
  
  //   test(`mulit options`, () => {
  //     const code: string = `interface Options { foo: string, bar: number }`
  //     expect(
  //       runYargs(code, '--foo bar --bar 42')
  //     ).toMatchObject({ foo: `bar`, bar: 42 })
  //   })
  
  //   test(`enum option`, () => {
  //     const code: string = `\
  // enum E { A = 'foo', B = 'bar' }
  // interface Options { e: E }`
  //     expect(
  //       runYargs(code, '--e foo', code => `\
  // var E;
  // (function (E) {
  //     E["A"] = "foo";
  //     E["B"] = "bar";
  // })(E || (E = {}));
  
  // ${code}
  // `)
  //     ).toMatchObject({ e: `foo` })
  //   })
  // })
  
  describe(`makeOptionJSDocTagExpression()`, () => {
    describe(`@alias`, () => {
      test(`alias`, () => {
        const code: string = `interface Options { 
/**@alias f */
foo: string }`
        const decl = getInterfaceProperty(code)
        const resolved = makeOptionJSDocTagExpression(decl)
        expect(resolved).toEqual({ alias: ts.createStringLiteral(`f`) })
      })
    })

    describe(`@default`, () => {
      test(`string`, () => {
        const code: string = `interface Options { 
/**@default "bar" */
foo: string }`
        const decl = getInterfaceProperty(code)
        const resolved = makeOptionJSDocTagExpression(decl)
        expect(resolved).toEqual({ default: ts.createStringLiteral(`bar`) })
      })

      test(`number`, () => {
        const code: string = `interface Options { 
/**@default 42 */
foo: number }`
        const decl = getInterfaceProperty(code)
        const resolved = makeOptionJSDocTagExpression(decl)
        expect(resolved).toEqual({ default: ts.createNumericLiteral(`42`) })
      })
    })
  })

  describe(`@demandOption, @require, @required`, () => {
    test(`demandOption`, () => {
      const code: string = `interface Options { 
/**@demandOption */
foo: string }`
      const decl = getInterfaceProperty(code)
      const resolved = makeOptionJSDocTagExpression(decl)
      expect(resolved).toEqual({ demandOption: ts.createTrue() })
    })

    test(`require`, () => {
      const code: string = `interface Options { 
/**@required */
foo: string }`
      const decl = getInterfaceProperty(code)
      const resolved = makeOptionJSDocTagExpression(decl)
      expect(resolved).toEqual({ demandOption: ts.createTrue() })
    })
  })
})



// #region helpers

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

function getInterfaceDecl(code: string): InterfaceDeclaration {
  const project = new Project({
    skipFileDependencyResolution: true
  })
  const sourceFile = project.createSourceFile(`tmp.ts`, code)
  return sourceFile.getInterfaces()[0]
}

function getInterfaceProperty(code: string, index: number = 0): PropertySignature {
  const decl = getInterfaceDecl(code)
  const props = decl.getProperties()
  return props[index]
}

export function runYargs(code: string, args: string = '', override?: (code: string) => string): yargs.Arguments {
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
