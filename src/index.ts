import generate from './generator'


export interface Options {
  /**
   * Output file path, output to stdout when not set
   * @alias o
   */
  output?: string
  /**
   * Force override output file content when file already exists, request Y/n when not set
   */
  force?: boolean
  /**
   * Output json data
   */
  json?: boolean
  /**
   * Output with color when write data to stdout
   */
  color?: boolean
  /**
   * Output full infomations
   */
  verbose?: boolean
}

export default async function main(entry: string, options: Options = {}): Promise<void> {
  generate(entry, options)
}

export { default as resolve, COMMAND_JSDOC_TAG } from './resolver'
export { transformCommand, transformOption, COMMAND_OPTIONS_PARAMETER_REGEXP } from './transformer'
export { default as render } from './render'
export { default as generate } from './generator'
export { default as emit, EmitOptions, DEFAULT_EMITOPTIONS } from './emitter'
