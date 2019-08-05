import { getFilePath } from './generator'

describe(`getFilePath()`, () => {
  test(`absolute paths`, () => {
    const resolved = getFilePath('/a/b', '/a/c')
    expect(resolved).toBe('./c')
  })
})
