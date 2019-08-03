import * as ts from 'typescript'
import render, { makeWrapper, makeLibImportDeclarationNode } from './render'
import { print } from './generator'
import { transformCommand } from './transformer'
import { Project, FunctionDeclaration } from 'ts-morph'

describe.skip(`generate()`, () => {
  test(`default`, () => {
    const code = `\
interface Options {
  foo: string
}

function command(input: string, options: Options) {}`
    const node = getFunctionDecl(code)
    const result = transformCommand(node)
    const out = print(render(result))
    console.log(`
${code}

==========

${out}
`)
  })
})

describe(`makeWrapper()`, () => {
  test(`basic`, () => {
    const result: string = print(makeWrapper(ts.createLiteral(42) as any))
    expect(result).toMatchSnapshot()
  })
})

describe(`makeLibImportDeclarationNode()`, () => {
  test(`import yargs`, () => {
    const resolved = print(makeLibImportDeclarationNode(`yargs`, `yargs`))
    expect(resolved).toBe(`import * as yargs from "yargs";\n`)
  })
})

function getFunctionDecl(code: string): FunctionDeclaration {
  const project = new Project()
  const sourceFile = project.createSourceFile(`tmp.ts`, code)
  return sourceFile.getFunctions()[0]
}
