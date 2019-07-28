import { Project, ts, printNode } from 'ts-morph'
import convert from './transform-option'

describe(`convert() types`, () => {
  test(`string`, () => {
    const code: string = `interface Options { foo: string }`
    expect(print(code)).toMatchSnapshot()
  })
  
  test(`number`, () => {
    const code: string = `interface Options { foo: number }`
    expect(print(code)).toMatchSnapshot()
  })

  test(`boolean`, () => {
    const code: string = `interface Options { foo: boolean }`
    expect(print(code)).toMatchSnapshot()
  })

  test(`string[]`, () => {
    const code: string = `interface Options { foo: string[] }`
    expect(print(code)).toMatchSnapshot()
  })

  test(`Array<string>`, () => {
    const code: string = `interface Options { foo: Array<string> }`
    expect(print(code)).toMatchSnapshot()
  })

  test(`number[]`, () => {
    const code: string = `interface Options { foo: number[] }`
    expect(print(code)).toMatchSnapshot()
  })

  test(`Array<number>`, () => {
    const code: string = `interface Options { foo: Array<number> }`
    expect(print(code)).toMatchSnapshot()
  })

  test(`boolean[]`, () => {
    const code: string = `interface Options { foo: boolean[] }`
    expect(print(code)).toMatchSnapshot()
  })

  test(`Array<boolean>`, () => {
    const code: string = `interface Options { foo: Array<boolean> }`
    expect(print(code)).toMatchSnapshot()
  })

  test.only(`enum`, () => {
    const code: string = `\
enum E { A = 'a', B = 'b' }
interface Options { foo: E }
`
    expect(print(code)).toMatchSnapshot()
  })
})

function print(code: string): string {
  const project = new Project({
    skipFileDependencyResolution: true
  })
  const sourceFile = project.createSourceFile(`tmp.ts`, code)
  const nodes = convert(sourceFile.getInterfaces()[0])
  // console.log(require('util').inspect(nodes[0], { depth: null }))
  console.log(printNode(nodes[0]))
  return ts.createPrinter().printList(ts.ListFormat.MultiLine, nodes as any, sourceFile as any)
}
