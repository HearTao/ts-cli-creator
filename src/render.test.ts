import * as ts from 'typescript'
import render, { render, generateWrapper } from './render'
import { transformCommand } from './transformer'
import { Project, FunctionDeclaration } from 'ts-morph'

describe.only(`generate()`, () => {
  test(`default`, () => {
    const code = `\
interface Options {
  foo: string
}

function command(input: string, options: Options) {}`
    const node = getFunctionDecl(code)
    const result = transformCommand(node)
    const out = render(render(result))
    console.log(`
${code}

==========

${out}
`)
  })
})

describe(`generateWrapper()`, () => {
  test(`basic`, () => {
    const result: string = render(generateWrapper(ts.createLiteral(42) as any))
    expect(result).toMatchSnapshot()
  })
})

function getFunctionDecl(code: string): FunctionDeclaration {
  const project = new Project({
    skipFileDependencyResolution: true
  })
  const sourceFile = project.createSourceFile(`tmp.ts`, code)
  return sourceFile.getFunctions()[0]
}
