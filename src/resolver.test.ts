import { FunctionDeclaration, Project } from "ts-morph"
import resolve, { isTaged, sortFunctionDeclarations, getFunctionDeclaration, getExportedFunctionDeclarations, makeNoFunctionError } from './resolver'
import { print } from './generator'

describe(`resolve()`, () => {
  test(`throw no function found`, () => {
    const code = ``
    const sourceFile = (new Project).createSourceFile(`tmp.ts`, code)
    expect(() => resolve(sourceFile)).toThrowError(makeNoFunctionError())
  })

  test(`function`, () => {
    const code = `function foo(){}`
    const node = getFunctionDecl(code)
    const sf = (new Project).createSourceFile(`tmp.ts`, code)
    const resolved = print(resolve(sf).compilerNode)
    expect(resolved).toBe(print(node.compilerNode))
  })

  test(`function exported`, () => {
    const code = `export function foo() {}`
    const sourceFile = (new Project).createSourceFile(`tmp.ts`, code)
    const resolved = resolve(sourceFile)
    expect(print(resolved.compilerNode)).toBe(print(getFunctionDecl(code).compilerNode))
  })
})

describe(`getExportedFunctionDeclarations()`, () => {
  test(`filtered`, () => {
    const decl1 = getFunctionDecl(`export function foo(){}`)
    const decl2 = getFunctionDecl(`function bar(){}`)
    const decl3 = getFunctionDecl(`export function baz(){}`)
    const resolved = getExportedFunctionDeclarations([decl1, decl2, decl3])
    expect(resolved).toEqual([decl1, decl3])
  })
})

describe(`getFunctionDeclaration()`, () => {
  test(`ordered`, () => {
    const decl1 = getFunctionDecl(`export default function foo(){}`)
    const decl2 = getFunctionDecl(`function bar(){}`)
    const decl3 = getFunctionDecl(`/** @command */function baz(){}`)
    const resolved1 = getFunctionDeclaration([decl3, decl2, decl1])
    expect(resolved1.getName()).toBe(decl1.getName())
    const resolved2 = getFunctionDeclaration([decl3, decl2])
    expect(resolved2.getName()).toBe(decl3.getName())
  })
})

describe(`sortFunctionDeclarations()`, () => {
  test(`order by default export`, () => {
    const decl1 = getFunctionDecl(`export default function(){}`)
    const decl2 = getFunctionDecl(`function(){}`)
    const resolved1 = sortFunctionDeclarations(decl1, decl2)
    expect(resolved1).toBe(-1)
    const resolved2 = sortFunctionDeclarations(decl2, decl1)
    expect(resolved2).toBe(1)
  })

  test(`order by taged`, () => {
    const decl1 = getFunctionDecl(`/** @command */function foo(){}`)
    const decl2 = getFunctionDecl(`function(){}`)
    const decl3 = getFunctionDecl(`/** @command */function bar(){}`)
    const resolved1 = sortFunctionDeclarations(decl1, decl2)
    expect(resolved1).toBe(-1)
    const resolved2 = sortFunctionDeclarations(decl2, decl1)
    expect(resolved2).toBe(1)
    const resolved3 = sortFunctionDeclarations(decl3, decl1)
    expect(resolved3).toBe(0)
  })
})

describe(`isTaged()`, () => {
  test(`true`, () => {
    const decl = getFunctionDecl(`/** @command */function(){}`)
    expect(isTaged(decl)).toBeTruthy()
  })
  
  test(`false`, () => {
    const decl = getFunctionDecl(`function(){}`)
    expect(isTaged(decl)).toBeFalsy()
  })
})


function getFunctionDecl(code: string): FunctionDeclaration {
  const project = new Project({
    skipFileDependencyResolution: true
  })
  const sourceFile = project.createSourceFile(`tmp.ts`, code)
  return sourceFile.getFunctions()[0]
}
