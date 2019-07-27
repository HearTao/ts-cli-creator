import * as path from 'path'
import resolveEntry from './resolve-entry'

test(`resolveEntry()`, () => {
  const entry = path.resolve(__dirname, `index.ts`)
  resolveEntry(entry)
})
