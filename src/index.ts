import generate, { Context } from './generator'


export interface Options {
  /**
   * Output file path, output to stdout when not set
   * @alias o
   */
  output?: string
  /**
   * Generate js file, base on your tsconfig
   */
  js?: boolean
  /**
   * Force override output file content when file already exists, request Y/n when not set
   */
  force?: boolean
  /**
   * Output json data
   */
  json?: boolean
  /**
   * Colourful output with write to stdout
   */
  color?: boolean
  /**
   * Output full infomations
   */
  verbose?: boolean
  /**
   * Generate Wrapper function name, default to 'cli'
   */
  functionName?: string
  /**
   * Use async function, default to true
   */
  asyncFunction?: boolean
  /**
   * Add main function call at last, default to false
   */
  runnable?: boolean
  /**
   * Enable strict mode, default true
   */
  strict?: boolean
  /**
   * Enable --help opiotn, default true
   */
  help?: boolean
  /**
   * Enable -h alias for helper, default true
   */
  helpAlias?: boolean
  /**
   * Enable --version option, default true
   */
  version?: boolean
}

/**
 * Yet another cli generator based TypeScript code
 * 
 * @param entry entry file
 */
export default async function main(entry: string, options: Options = {}): Promise<void> {
  const context = main.__CLICONTEXT__
  generate(entry, options, context)
}

main.__CLICONTEXT__ = <Context>{
  stdin: false
}

export { default as resolve, COMMAND_JSDOC_TAG } from './resolver'
export { transformCommand, transformOption } from './transformer'
export { default as render } from './render'
export { default as generate } from './generator'
export { default as emit, EmitOptions, DEFAULT_EMITOPTIONS } from './emitter'
