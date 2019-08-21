<br/>

<div align=center>

# ts-cli-creator

_Yet another cli generator based TypeScript code_

_`npm i -g ts-cli-creator`_

</div>

<br />

## Usage

```sh
ts-cli-creator <entry>
```

Given the entry file:

```ts
export interface Options {
    foo: string
}

function command(param: string, options: Options): void {
    /* your code here */
}

export default command
```

Will generate:

```ts
import * as yargs from 'yargs'
import handler from './handler'

export default function main(args: string[] = process.argv.slice(2)): void {
    yargs
        .strict()
        .command(
            '$0 <param>', '', 
            yargs => {
                return yargs
                    .positional('param', { type: string, demandOption: "true" })
                    .option('foo', { type: string })
            },
            args => {
                const { _, $0, param, ...options } = args
                handler(param, options)
            })
        .help()
        .alias('help', 'h')
        .parse(args)
}
```

## Generator

### Genreate command

**ts-cli-creator** generate a yargs commander from function declaration.

#### 1. Transform function parameters to commander required positional arguments

```ts
function command(foo: string, bar?: number) {}
```

Transform to:

```ts
.command(`$0 <foo> <bar>`, ``, 
    yargs => {
        return yargs
            .positional(`foo`, { type: string, demandOption: "true" })
            .positional(`bar`, { type: number })
    },
    args => {
        const { _, $0, foo, bar } = args
        handler(foo, bar)
    }
)
```

Supports positional argument types:

| Typescript Types | Yargs Positional Options |
|------|-------|
| `string` | `{ type: 'string' }` |
| `number` | `{ type: 'number' }` |
| `boolean` | `{ type: 'boolean' }` |
| `enum E(string iterial only)` | `{ choices: E[] }` |


#### 2. Transform JSDoc parameter description to commander description

```ts
/**
 * Description for commander
 */
function command() {}
```

Transform to:

```ts
.command(`$0`, `Description for command`)
```


### Generate options

When the name of function last param matched `/^options?$/`, and type was interface declaration. like:

```ts
interface Options {}
function command(param: string, options: Options) {}
```

**ts-cli-creator** will generate yargs options for you:

#### 1. Transform interface properties to commander options

```ts
interface Options {
    foo: string
}
```

Transform to:

```ts
.option(`foo`, { type: `string` })
```

Supports options types:

| Typescript Types | Yargs Options |
|------|-------|
| `string` | `{ type: 'string' }` |
| `number` | `{ type: 'number' }` |
| `boolean` | `{ type: 'boolean' }` |
| `string[]` | `{ type: 'string', array: true }` |
| `number[]` | `{ type: 'number', array: true }` |
| `boolean[]` | `{ type: 'boolean', array: true }` |
| `enum E(string iterial only)` | `{ choices: E[] }` |


#### 2. Transform JSDoc interface properties comments to options description

```ts
interface Options {
    /** A description for foo */
    foo: string
}
```

Transform to:

```ts
.option('foo', {
    type: 'string',
    description: 'A description for foo'
})
```

#### 3. Transform JSDoc custom tags @alias, @default, @demandOption to options properties

```ts
interface Options {
    /** 
     * @default 42
     * @demandOption
     */
    foo: number,
    /**
     * @alias b
     * @default 'baz'
     */
    bar: string
}
```

Transform to:

```ts
.option(`foo`, {
    type: `number`,
    default: 42,
    demandOption: true
})
.option(`bar`, {
    type: `string`,
    alias: `b`,
    default: `baz`
})
```

Supports options properties:

| JSDoc tag | Yargs option |
|------|-------|
| `@alias` | alias |
| `@default` | default |
| `@demandOption` | demandOption |
| `@require` | demandOption |
| `@required` | demandOption |

## Cli usage

### output content to terminal

```sh
ts-cli-creator ./src/handler.ts
```

### write to file

```sh
ts-cli-creator ./src/handler.ts -o ./cli.ts
```

Generate file to `./src/cli.ts`. The output path relative entry directory path when not use absolute path.

### read data from pipe

```sh
cat ./src/handler.ts | ts-cli-creator
```

or

```sh
echo function add(a:number,b:number){} | ts-cli-creator
```

> Warning. this mode will inline the code to output content replace require the entry module


### preview cli

You can preview cli message via `--runnable` option and pass raw arguments:

```
ts-cli-creator ./src/handler.ts --no-color --runnable --js -- -h | node
```

Or use ts-node:

```
ts-cli-creator ./src/handler.ts --no-color --runnable  -- -h | ts-node -T --skip-project ./cli.ts
```

See the simple example:

```sh
echo function add(a:number,b:number){console.log(a+b)} | ts-cli-creator --no-color --js -- 1 2 | node

## will output 3
```

<div align=center>

&nbsp;

![Preview](https://user-images.githubusercontent.com/5752902/63343447-88364900-c380-11e9-9b7d-f810a70d0431.gif)

&nbsp;

</div>

## Cli Options

| Name | Description | Type | Default |
|------|-------|--------|---------|
| --output, -o | Output file path, output to stdout when not set | `string` | `undefined` |
| --js | Generate js file, base on your tsconfig | `boolean` | `false` |
| --json | Output json data | `boolean` | `false` |
| --color | Colourful output with write to stdout | `boolean` | `true` |
| --verbose | Output full infomations | `boolean` | `false` |
| --function-name | Generate Wrapper function name | `string` | `cli` |
| --async-function | Use async function | `boolean` | `false` |
| --runnable | Add main function call at last, default to false | `boolean` | `false` |
| --strict | enable strict mode | `boolean` | `true` |
| --helper | global helper options to show helper messages  | `boolean` | `true` |
| --helper-alias | helper options short for 'h'  | `boolean` | `true` |
| --version | global version options, show current version  | `boolean` | `true` |

## TODOS

- [ ] Sub commander
- [ ] Custom type parser
- [ ] Other cli provider, like commander
