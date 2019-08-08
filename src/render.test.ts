import { makeLibImportDeclarationNode, makeArrowFunctionNode, makeWrapperFunctionDeclaration, DEFAULT_RENDER_OPTIONS, makeRefImportDeclarationNode, makeWrapper, makePositionalCommandString } from './render'
import { print } from './generator'
import { Project, ts } from 'ts-morph'
import { DeclarationExportType } from './transformer'

describe(`makeWrapper()`, () => {
  describe(`makeLibImportDeclarationNode()`, () => {
    test(`default`, () => {
      const resolved = print(makeLibImportDeclarationNode(`yargs`, `yargs`, { stdin: false }))
      expect(resolved).toBe(`import * as yargs from "yargs";\n`)
    })
    test(`stdin`, () => {
      const resolved = print(makeLibImportDeclarationNode(`yargs`, `yargs`, { stdin: false }))
      expect(resolved).toBe(`import * as yargs from "yargs";\n`)
    })
  })

  describe(`makeRefImportDeclarationNode()`, () => {
    test(`default`, () => {
      const sf = (new Project()).createSourceFile(`./__tmp__.ts`)
      const result = {
        name: '',
        ref: new Map,
        description: ts.createStringLiteral(''),
        positionals: [],
        options: []
      }
      const resolved = print(makeRefImportDeclarationNode(sf, result))
      expect(resolved).toBe('')
    })

    test(`command default export`, () => {
      const proj = new Project
      const sf = proj.createSourceFile(`./TMP.ts`)
      const sf1 = proj.createSourceFile(`./lib1.ts`, `export default function foo() {}`)
      const node = sf1.getFunctions()[0]
      if(undefined === node) throw 42
      const result = {
        name: ``,
        ref: new Map([[ sf1, { default: [{
          name: `foo`,
          type: DeclarationExportType.Default,
          node,
          sourceFile: sf1
        }], named: [] } ]]),
        description: ts.createStringLiteral(''),
        positionals: [],
        options: []
      }
      const resolved = print(makeRefImportDeclarationNode(sf, result))
      expect(resolved).toBe(`import foo from "./lib1";\n`)
    })

    test(`command default export anonymous function declaration`, () => {
      const proj = new Project
      const sf = proj.createSourceFile(`./TMP.ts`)
      const sf1 = proj.createSourceFile(`./lib1.ts`, `export default function() {}`)
      const node = sf1.getFunctions()[0]
      if(undefined === node) throw 42
      const result = {
        name: ``,
        ref: new Map([[ sf1, { default: [{
          name: ``,
          type: DeclarationExportType.Default,
          node,
          sourceFile: sf1
        }], named: [] } ]]),
        description: ts.createStringLiteral(''),
        positionals: [],
        options: []
      }
      const resolved = print(makeRefImportDeclarationNode(sf, result))
      expect(resolved).toBe(`import lib1 from "./lib1";\n`)
    })

    test(`command named export`, () => {
      const proj = new Project
      const sf = proj.createSourceFile(`./TMP.ts`)
      const sf1 = proj.createSourceFile(`./lib1.ts`, `export default function foo() {}`)
      const node = sf1.getFunctions()[0]
      if(undefined === node) throw 42
      const result = {
        name: ``,
        ref: new Map([[ sf1, { named: [{
          name: `foo`,
          type: DeclarationExportType.Default,
          node,
          sourceFile: sf1
        }], default: [] } ]]),
        description: ts.createStringLiteral(''),
        positionals: [],
        options: []
      }
      const resolved = print(makeRefImportDeclarationNode(sf, result))
      expect(resolved).toBe(`import { foo } from "./lib1";\n`)
    })

    test(`command default and named export`, () => {
      const proj = new Project
      const sf = proj.createSourceFile(`./TMP.ts`)
      const sf1 = proj.createSourceFile(`./lib1.ts`, `function foo() {}; function bar() {}`)
      const node = sf1.getFunctions()[0]
      const node2 = sf1.getFunctions()[1]
      if(undefined === node) throw 42
      const result = {
        name: ``,
        ref: new Map([[ sf1, { default: [{
          name: `foo`,
          type: DeclarationExportType.Default,
          node,
          sourceFile: sf1
        }], named: [{
          name: `bar`,
          type: DeclarationExportType.Named,
          node: node2,
          sourceFile: sf1
        }] } ]]),
        description: ts.createStringLiteral(''),
        positionals: [],
        options: []
      }
      const resolved = print(makeRefImportDeclarationNode(sf, result))
      expect(resolved).toBe(`import foo, { bar } from "./lib1";\n`)
    })

    test(`multi sourceFiles`, () => {
      const proj = new Project
      const sf = proj.createSourceFile(`./TMP.ts`)
      const sf1 = proj.createSourceFile(`./lib1.ts`, `function foo() {};`)
      const sf2 = proj.createSourceFile(`./lib2.ts`, `function bar() {};`)
      const node1 = sf1.getFunctions()[0]
      const node2 = sf2.getFunctions()[0]
      const result = {
        name: ``,
        ref: new Map([
          [ sf1, { default: [{
            name: `foo`,
            type: DeclarationExportType.Default,
            node: node1,
            sourceFile: sf1
          }], named: [] } ],
          [ sf2, { default: [{
            name: `bar`,
            type: DeclarationExportType.Default,
            node: node2,
            sourceFile: sf2
          }], named: [] } ]
        ]),
        description: ts.createStringLiteral(''),
        positionals: [],
        options: []
      }
      const resolved = print(makeRefImportDeclarationNode(sf, result))
      expect(resolved).toBe(`import foo from "./lib1";\nimport bar from "./lib2";\n`)
    })
  })

  describe(`makeWrapperFunctionDeclaration()`, () => {
    test(`default`, () => {
      const resolved = print(makeWrapperFunctionDeclaration([], { ...DEFAULT_RENDER_OPTIONS }))
      expect(resolved).toBe(`export default async function cli(): Promise<void> {}\n`)
    })

    test(`function name`, () => {
      const resolved = print(makeWrapperFunctionDeclaration([], { ...DEFAULT_RENDER_OPTIONS, functionName: `foo` }))
      expect(resolved).toBe(`export default async function foo(): Promise<void> {}\n`)
    })

    test(`no async`, () => {
      const resolved = print(makeWrapperFunctionDeclaration([], { ...DEFAULT_RENDER_OPTIONS, asyncFunction: false }))
      expect(resolved).toBe(`export default function cli(): void {}\n`)
    })
  })

  describe(`makeWrapper()`, () => {
    test(`default`, () => {
      const proj = new Project
      const osf = proj.createSourceFile(`./__tmpo__.ts`)
      const esf = proj.createSourceFile(`./__tmpe__.ts`)
      const result = {
        name: '',
        ref: new Map,
        description: ts.createStringLiteral(''),
        positionals: [],
        options: []
      }
      const resolved = print(makeWrapper([], {
        outputSourceFile: osf,
        entrySourceFile: esf,
        result,
        context: {},
        options: { ...DEFAULT_RENDER_OPTIONS }
      }))
      expect(resolved).toBe(`\
import * as yargs from "yargs";
export default async function cli(): Promise<void> {}
`)
    })

    test(`stdin`, () => {
      const proj = new Project
      const osf = proj.createSourceFile(`./__tmpo__.ts`)
      const esf = proj.createSourceFile(`./__tmpe__.ts`)
      const result = {
        name: '',
        ref: new Map,
        description: ts.createStringLiteral(''),
        positionals: [],
        options: []
      }
      const resolved = print(makeWrapper([], {
        outputSourceFile: osf,
        entrySourceFile: esf,
        result,
        context: { stdin: true },
        options: { ...DEFAULT_RENDER_OPTIONS }
      }))
      expect(resolved).toBe(`\
import * as yargs from "yargs";
export default async function cli(): Promise<void> {}
cli();
`.replace(/"yargs"/, `"${require.resolve(`yargs`).replace(/\\/g, '\\\\')}"`))
    })
  })
})



describe(`makeArrowFunctionNode()`, () => {
  test(`single param`, () => {
    const resolved = print(makeArrowFunctionNode(`foo`, []))
    expect(resolved).toBe(`foo => {};\n`)
  })
})

describe(`makeCommandNode()`, () => {
  describe(`makePositionalCommandString()`, () => {
    test(`default`, () => {
      const result = {
        name: '',
        ref: new Map,
        description: ts.createStringLiteral(''),
        positionals: [],
        options: []
      }
      const resolved = print(makePositionalCommandString(result)).trim()
      expect(resolved).toBe(`"$0";`)
    })

    test(`positionals`, () => {
      const result = {
        name: '',
        ref: new Map,
        description: ts.createStringLiteral(''),
        positionals: [[`foo`], [`bar`]],
        options: []
      }
      const resolved = print(makePositionalCommandString(result as any)).trim()
      expect(resolved).toBe(`"$0 <foo> <bar>";`)
    })

    test(`options`, () => {
      const result = {
        name: '',
        ref: new Map,
        description: ts.createStringLiteral(''),
        positionals: [],
        options: [42]
      }
      const resolved = print(makePositionalCommandString(result as any)).trim()
      expect(resolved).toBe(`"$0 [...options]";`)
    })

    test(`positional and options`, () => {
      const result = {
        name: '',
        ref: new Map,
        description: ts.createStringLiteral(''),
        positionals: [[`foo`], [`bar`]],
        options: [42]
      }
      const resolved = print(makePositionalCommandString(result as any)).trim()
      expect(resolved).toBe(`"$0 <foo> <bar> [...options]";`)
    })
  })
})
