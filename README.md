<br/>

<div align=center>

# ts-cli

_Yet another cli generator based TypeScript code_

_`npm i -g ts-cli`_

</div>

<br />

## Usage

The entry file:

```ts
export interface Options {
    foo: string
}

function command(param: string, options: Options): void {
    /* your code here */
}

export default command
```

Generated `cli.ts` file:

```ts
import * as yargs from 'yargs'
import handler from './handler'

export default async function main(): Promise<void> {
    yargs
        .strict()
        .command(
            '$0 <param> [...options]', '', 
            yargs => {
                return yargs
                    .positional('param', { type: string })
                    .option('foo', { type: string })
            },
            args => {
                const { _, $0, param, ...options } = args
                if(undefined === param) throw new TypeError(`Argument param was required`)
                handler(param, options)
            })
        .help()
        .alias('help', 'h')
        .argv
}
```

## Generator

### Genreate command

**ts-cli** generate a yargs commander from function declaration.

#### 1. Transform function parameters to commander required positional arguments

```ts
function command(foo: string, bar: number) {}
```

Will transform to:

```ts
yargs.command(`$0 <foo>`, ``, 
    yargs => {
        return yargs
            .positional(`foo`, { type: string })
            .positional(`bar`, { type: number})
    },
    args => {
        const { _, $0, foo, bar } = args
        if(undefined === foo) 
            throw new TypeError(`Argument "foo" was required`)
        if(undefined === bar) 
            throw new TypeError(`Argument "bar" was required`)
        handler(foo, bar)
    }
)
```

Supports positional argument types:

| Typescript Types | Yargs Options |
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
yargs.command(`$0`, `Description for command`)
```


### Generate options

When the name of function last param matched `/options?/`, and type as interface declaration. like:

```ts
interface Options {}
function command(param: string, options: Options) {}
//                                ^~~~~ matched /options?/
```

**ts-cli** will generate yargs options for you. see below: 

#### 1. Transform interface properties to commander options

```ts
interface Options {
    foo: string
}
```

Transform to:

```ts
yargs.option(`foo`, { type: `string` })
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
| @alias | alias |
| @default | default |
| @demandOption | demandOption |
| @require | demandOption |
| @required | demandOption |

## Cli usage

### output content to stdout

```sh
ts-cli ./src/handler.ts
```

### write to file

```sh
ts-cli ./src/handler.ts ./cli.ts
```

Will generate file to `./src/cli.ts`

### read entry data from stdio

```sh
cat ./src/handler.ts | ts-cli
```

or

```sh
echo function add(a:number,b:number){} | ts-cli
```

### preview cli message

ts-cli ./src/handler.ts | ts-node --skip-project


## Cli Options

| Name | Description | Type | Default |
|------|-------|--------|---------|
| output | Output file path, output to stdout when not set | `string` | `undefined` |
| strict | enable strict mode | `boolean` | `true` |
| helper | global helper options to show helper messages  | `boolean` | `true` |
| helperAlias | helper options short for 'h'  | `boolean` | `true` |
| version | global version options, show current version  | `boolean` | `true` |

## TODOS

- [ ] Sub commander
- [ ] Other cli provider, like commander
