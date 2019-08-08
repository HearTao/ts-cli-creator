import { ts, Project, printNode, SourceFile } from 'ts-morph'
import * as prettier from 'prettier'
import * as path from 'path'
import resolve from './resolver'
import { transformCommand } from './transformer'
import render, { RenderOptions } from './render'
import emit, { EmitOptions, Writter, DEFAULT_WRITTER } from './emitter'

export interface Context {
  stdin?: boolean
}

export interface GenerateOptions {
  output?: string
  bin?: boolean
  run?: boolean
}

export type Options =
  & GenerateOptions
  & EmitOptions
  & RenderOptions

export default function generate(entry: string, options: Partial<Options> = {}, context: Context = {}): void {
  const isOutputToStdout = undefined === options.output
  const project = new Project()
  const { outputPath, entrySourceFile } = resolveEntry(entry, project, options, Boolean(context.stdin))
  const outputSourceFile = project.createSourceFile(outputPath, ``, { overwrite: true })
  const functionDeclaration = resolve(entrySourceFile)
  if(undefined === functionDeclaration) throw 42 /**@todo sub commit */
  
  const transformed = transformCommand(functionDeclaration)
  
  const out = render(transformed, outputSourceFile, entrySourceFile, {}, context)
  const result = print(out)

  const emitOptions = {
    verbose: options.verbose,
    force: options.force,
    writer: DEFAULT_WRITTER[isOutputToStdout ? Writter.Log : Writter.FS],
    json: options.json,
    color: options.color,
    from: entry,
    to: isOutputToStdout ? `STDOUT` : outputPath
  }
  
  emit(outputPath, result, emitOptions)
}

function resolveEntry(entry: string, project: Project, options: GenerateOptions, stdin: boolean): { outputPath: string, entrySourceFile: SourceFile } {
  const { output = './cli.ts' } = options
  const entryPath = stdin ? path.resolve('__STDIN__.ts') : path.resolve(entry)
  const context = stdin ? entryPath : path.dirname(entryPath)
  const outputPath = path.isAbsolute(output) ? output : path.resolve(context, output)
  const entrySourceFile = stdin ? project.createSourceFile(entryPath, entry) : project.addExistingSourceFile(entryPath)
  return { outputPath, entrySourceFile }
}

export function print(nodes: ts.Node | ts.Node[], options: prettier.Options = {}): string {
  const ns = Array.isArray(nodes) ? nodes : [ nodes ]
  const code = ns.map(node => printNode(node)).join(`\n`)
  return prettier.format(code, { parser: 'typescript', ...options })
}
