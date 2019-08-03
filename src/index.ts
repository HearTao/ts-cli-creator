import * as fs  from 'fs'
import * as path from 'path'
import generate from './generator'

export interface Options {
  output?: string
}

// const DEFAULT_OPTIONS: Options = {
//   output: './cli.ts'
// }

export default async function main(entry: string, options: Options): Promise<void> {
  const { output = `./cli.ts` } = options
  const entryPath: string = path.isAbsolute(entry) ? entry : path.resolve(entry)
  const outPath: string = path.isAbsolute(output) 
    ? output
    : path.resolve(path.dirname(entryPath), output)
  const content = fs.readFileSync(entryPath, `utf-8`)
  generate(content, outPath)
}


export { transformCommand, transformOption } from './transformer'
export { default as render } from './render'
export { default as generate } from './generator'
export { default as emit, EmitOptions, DEFAULT_EMITOPTIONS } from './emitter'
