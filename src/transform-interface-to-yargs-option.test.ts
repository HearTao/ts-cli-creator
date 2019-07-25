import { Project, ts } from 'ts-morph'
// import transform, { convertToYargsOption } from './transform-interface-to-yargs-option'
import convert from './transform-interface-to-yargs-option'

test(`transformInterfaceToYargsOption()`, () => {
  const code: string = `\
/**
 * @cliOptions
 */
interface Options {
  /**
   * description for Options.foo
   * @link a
   * @default 'bar'
   */
  foo: string
  bar: number
  /** */
  baz: boolean
}
`
  const project = new Project({
    skipFileDependencyResolution: true
  })
  const sourceFile = project.createSourceFile(`tmp.ts`, code)
  const result = convert(sourceFile)
  console.log(code, `\n\n`)
  if(null === result) return
  const ret = ts.createPrinter().printNode(ts.EmitHint.Unspecified, result, sourceFile as any)
  console.log(ret)
})

