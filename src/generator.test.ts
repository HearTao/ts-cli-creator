import * as path from 'path'
import { ts, Project } from 'ts-morph'
import { print, getInputAndOutputSourceFile } from './generator'

describe(`print()`, () => {
  test(`single`, () => {
    const resolved = print(ts.createIdentifier(`foo`)).trim()
    expect(resolved).toBe(`foo;`)
  })

  test(`multi`, () => {
    const resolved = print([
      ts.createIdentifier(`foo`),
      ts.createIdentifier(`bar`)
    ]).trim()
    expect(resolved).toBe(`foo;\nbar;`)
  })
})

describe(`getInputAndOutputSourceFile()`, () => {
  test(`normal`, () => {
    const proj = new Project
    const resolved = getInputAndOutputSourceFile(`./src/generator.ts`, proj, { output: `./cli.ts`}, false)
    expect(resolved.entrySourceFile.getFilePath()).toBe(fmt(path.resolve(`./src/generator.ts`)))
    expect(resolved.outputSourceFile.getFilePath()).toBe(fmt(path.resolve(`./src/cli.ts`)))
  })

  test(`stdin`, () => {
    const proj = new Project
    const resolved = getInputAndOutputSourceFile(`./src/generator.ts`, proj, { output: `./cli.ts`}, true)
    expect(resolved.entrySourceFile.getFilePath()).toBe(fmt(path.resolve(`./__STDIN__.ts`)))
    expect(resolved.outputSourceFile.getFilePath()).toBe(fmt(path.resolve(`./cli.ts`)))
  })
})

function fmt(filePath: string): string {
  return filePath.replace(/\\/g, `\/`)
}
