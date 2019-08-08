import { ts, Project, printNode } from 'ts-morph'
import * as prettier from 'prettier'
import * as path from 'path'
import resolve from './resolver'
import { transformCommand } from './transformer'
import render, { RenderOptions } from './render'
import emit, { EmitOptions, Writter, DEFAULT_WRITTER } from './emitter'

interface GenerateOptions {
  output?: string
}

export type Options = 
  & GenerateOptions 
  & EmitOptions 
  & RenderOptions

export default function generate(entry: string, options: Partial<Options> = {}): void {
  const entryPath = path.isAbsolute(entry) ? entry : path.resolve(entry)
  const isOutputToStdout = undefined === options.output
  const output = options.output || './cli.ts'
  const outputPath = path.isAbsolute(output) ? output : path.resolve(path.dirname(entryPath), output)

  const project = new Project()
  const outputSourceFile = project.createSourceFile(outputPath, ``, { overwrite: true })
  const entrySourceFile = project.addExistingSourceFile(entryPath)
  const functionDeclaration = resolve(entrySourceFile)
  if(undefined === functionDeclaration) throw 42 /**@todo sub commit */
  
  const result = transformCommand(functionDeclaration)
  
  const out = render(result, outputSourceFile, entrySourceFile, {

  })

  const emitOptions = {
    verbose: options.verbose,
    force: options.force,
    writer: DEFAULT_WRITTER[isOutputToStdout ? Writter.Log : Writter.FS],
    json: options.json,
    color: options.color,
    from: entry,
    to: isOutputToStdout ? `STDOUT` : outputPath
  }
  
  emit(outputPath, print(out), emitOptions)
}

export function print(nodes: ts.Node | ts.Node[], options: prettier.Options = {}): string {
  const ns = Array.isArray(nodes) ? nodes : [ nodes ]
  const code = ns.map(node => printNode(node)).join(`\n`)
  return prettier.format(code, { parser: 'typescript', ...options })
}
