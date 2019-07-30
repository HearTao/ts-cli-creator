import * as fs from 'fs'
import * as path from 'path'
import generate, { render } from './generate'
import resolveEntry from './resolve-entry'
import transformInterface from './transform-option'

export interface Options {
  entry: string
  output: string
}

export default function main(options: Options): void {
  const { entry, output } = options
  const entryPath: string = path.isAbsolute(entry) ? entry : path.resolve(entry)
  const [ , interfaceDecl ] = resolveEntry(entryPath)
  const optionCalls = transformInterface(interfaceDecl)
  const result: string = render(generate({
    optionCalls
  }))

  const outputPath = path.isAbsolute(output) ? output : path.resolve(path.dirname(entryPath), output)

  fs.writeFileSync(outputPath, result, `utf-8`)
  console.log(result)
}
