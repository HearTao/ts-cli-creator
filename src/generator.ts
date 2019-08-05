import { ts, Project, printNode } from 'ts-morph'
import * as prettier from 'prettier'
import * as path from 'path'
import resolve from './resolver'
import { transformCommand } from './transformer'
import render, { RenderOptions } from './render'
import emit, { EmitOptions } from './emitter'

const TEMPORARY_FILE_NAME: string = `__CLI__.ts`

type Options = EmitOptions & RenderOptions

export default function generate(code: string, outPath: string, entryPath: string, options: Partial<Options> = {}): void {
  const project = new Project()
  const sourceFile = project.createSourceFile(TEMPORARY_FILE_NAME, code)
  const functionDeclaration = resolve(sourceFile)
  if(undefined === functionDeclaration) throw 42 /**@todo */
  const result = transformCommand(functionDeclaration)
  const filePath = getFilePath(outPath, entryPath)
  const out = render(result, filePath)
  emit(outPath, print(out), options)
}

export function print(nodes: ts.Node | ts.Node[], options: prettier.Options = {}): string {
  const ns = Array.isArray(nodes) ? nodes : [ nodes ]
  const code = ns.map(node => printNode(node)).join(`\n`)
  return prettier.format(code, { parser: 'typescript', ...options })
}

export function getFilePath(outputPath: string, entryPath: string): string {
  if(!path.isAbsolute(outputPath) || !path.isAbsolute(entryPath)) throw makeNotAbsolutePathError()
  const outputDirPath = path.dirname(outputPath)
  const entryDirPath = path.dirname(entryPath)
  const entryBaseName = path.basename(entryPath, path.extname(entryPath))
  const entryEraseIndexName = `index` === entryBaseName ? '' : entryBaseName
  const relativePath = path.relative(outputDirPath, entryDirPath).replace(/\\/g, '\/')
  const dotifyPath = '' === relativePath ? '.' : relativePath
  return dotifyPath + '/' + entryEraseIndexName
} 

function makeNotAbsolutePathError(): Error {
  throw new Error(`The file path should be absolute path`)
}
