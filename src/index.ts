import * as path from 'path'
import generate, { render } from './generate'
import resolveEntry from './resolve-entry'
import transformOption from './transform-option'
import emit, { EmitOptions, DEFAULT_EMITOPTIONS } from './emit'

export interface Options {
  /**
   * @demandOption
   */
  entry: string
  output: string | undefined
}

export default async function main(options: Options): Promise<void> {
  const { entry, output = `./cli.ts` } = options
  const entryPath: string = path.isAbsolute(entry) ? entry : path.resolve(entry)
  const [ , interfaceDecl ] = resolveEntry(entryPath)
  const optionCalls = transformOption(interfaceDecl)
  const content: string = render(generate({
    optionCalls
  }))

  const filePath: string = path.isAbsolute(output) 
    ? output
    : path.resolve(path.dirname(entryPath), output)

  emit(filePath, content)
}

export { 
  emit, EmitOptions, DEFAULT_EMITOPTIONS,
  generate 
}
