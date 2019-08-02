import { ts, Project, SourceFile, FunctionDeclaration, printNode } from 'ts-morph'
import { transformCommand, getJSDoc, getJSDocTag } from './transformer'
import render from './render'
import emit from './emitter'
import * as prettier from 'prettier'

const COMMAND_JSDOC_TAG: string = `command`

export default function generate(code: string, outpath: string) {
  const project = new Project()
  const sourceFile: SourceFile = project.createSourceFile(`_cli.ts`, code)
  const functionDeclaration = getCommandFuncDecl(sourceFile.getFunctions())
  const result = transformCommand(functionDeclaration)
  const out = render(result)
  emit(outpath, print(out))
}

export function print(nodes: ts.Node[]) {
  const code = nodes.map(node => printNode(node)).join(`\n`)
  return prettier.format(code, { parser: 'typescript' })
}

export function getCommandFuncDecl(functionDecls: FunctionDeclaration[]): FunctionDeclaration {
  const tagedFuncDecl = getTagedFuncDecl(functionDecls)
  if(undefined !== tagedFuncDecl) return tagedFuncDecl
  return getDefaultFuncDecl(functionDecls)
}

function getTagedFuncDecl(functionDeclarations: FunctionDeclaration[]): FunctionDeclaration | undefined {
  return functionDeclarations.find(decl => {
    const jsdoc = getJSDoc(decl)
    if(null === jsdoc) return false
    const tag = getJSDocTag(jsdoc, COMMAND_JSDOC_TAG)
    if(null === tag) return false
    return true
  })
}

function getDefaultFuncDecl(functionDeclarations: FunctionDeclaration[]): FunctionDeclaration {
  const decl: FunctionDeclaration | undefined = functionDeclarations.find(decl => decl.isDefaultExport())
  if(undefined === decl) throw makeDefaultCommandFunctionNotFoundError()
  return decl
}

function makeDefaultCommandFunctionNotFoundError(): Error {
  return new Error(`Default command function not found`)
}
