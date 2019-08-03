import { ts, Project, printNode } from 'ts-morph'
import * as prettier from 'prettier'
import resolve from './resolver'
import { transformCommand } from './transformer'
import render from './render'
import emit, { EmitOptions } from './emitter'

const TEMPORARY_FILE_NAME: string = `__CLI__.ts`

type Options = EmitOptions

export default function generate(code: string, outpath: string, options: Partial<Options> = {}): void {
  const project = new Project()
  const sourceFile = project.createSourceFile(TEMPORARY_FILE_NAME, code)
  const functionDeclaration = resolve(sourceFile)
  if(undefined === functionDeclaration) throw 42 /**@todo */
  const result = transformCommand(functionDeclaration)
  const out = render(result)
  emit(outpath, print(out), options)
}

export function print(nodes: ts.Node | ts.Node[], options: prettier.Options = {}): string {
  const ns = Array.isArray(nodes) ? nodes : [ nodes ]
  const code = ns.map(node => printNode(node)).join(`\n`)
  return prettier.format(code, { parser: 'typescript', ...options })
}
