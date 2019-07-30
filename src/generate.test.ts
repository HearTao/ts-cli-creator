import * as ts from 'typescript'
import generate, { render, generateWrapper, GenerateOptions } from './generate'

describe(`generate()`, () => {
  test(`default`, () => {
    const options: Partial<GenerateOptions> = {
      optionCalls: [ ts.createCall(ts.createIdentifier('foo'), [], undefined) ]
    }
    const result = render(generate(options))
    console.log(result)
  })
})

describe(`generateWrapper()`, () => {
  test(`basic`, () => {
    const result: string = render(generateWrapper(ts.createLiteral(42) as any))
    expect(result).toMatchSnapshot()
  })
})
