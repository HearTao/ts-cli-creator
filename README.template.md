<br/>

<div align=center>

# ts-cli

_Yet another cli generator based TypeScript code_

_`npm i -D ts-cli`_

</div>

<br />


## Example

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

Generate `cli.ts` file:

```ts
import * as yargs from 'yargs'
import command from './command'

export default function main(): void {
    yargs
        .strict()
        .command(
            '$0 <param> [options]', '', 
            yargs => {
                return yargs
                    .positional('param', { type: string })
                    .option('foo', { type: string })
            },
            args => {
                const { _, $0, param, ...options } = args
                command(param, options)
            })
        .help()
        .alias('help', 'h')
        .argv
}
```

## Generate

### Genreate command

**ts-cli** generate a yargs commander from function declaration.

#### 1. Transform parameters to command required positional arguments

```ts
function command(foo: string, bar: number) {}
```

Transform to:

```ts
.command(`$0 <foo>`, ``, 
    yargs => yargs
        .positional(`foo`, { type: string })
        .positional(`bar`, { type: number}),
    args => {
        const { _, $0, foo, bar } = args
        if(undefined === foo) 
            throw new TypeError(`Argument "foo" was required`)
        if(undefined === bar) 
            throw new TypeError(`Argument "bar" was required`)
    }
)
```

Supports positional types:

| Typescript Types | Yargs Options |
|------|-------|
| `string` | `{ type: 'string' }` |
| `number` | `{ type: 'number' }` |
| `boolean` | `{ type: 'boolean' }` |
| `enum E(string iterial)` | `{ type: 'string', choices: [ ...(members of E) ] }` |


#### 2. Transform description from function declaration JSDocs

```ts
/**
 * Description for command
 */
function command() {}
```

Transform to:

```ts
.command(`$0`, `Description for command`)
```


### Generate options

If command last param match `/options?/`, and type was interface declaration. **ts-cli** will generate a options see below: 

#### 1. Transform interface properties to command options

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
| `enum E(string iterial)` | `{ type: 'string', choices: [ ...(members of E) ] }` |


#### 2. Transform description from interface property JSDoc description 

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

#### 3. Transform @alias, @default, @demandOption from property JSDoc

```ts
interface Options {
    /** 
     * @default 42
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
    default: 42
})
.option(`bar`, {
    type: `string`,
    alias: `b`,
    default: `baz`
})
```

## Options

| Name | Description | Type | Default | 
|------|-------|--------|---------|
| strict | enable strict mode | `boolean` | `true` |
| helper | global helper options to show helper messages  | `boolean` | `true` |
| helperAlias | helper options short for 'h'  | `boolean` | `true` |
| version | global version options, show current version  | `boolean` | `true` |

## TODOS

- [ ] Enum supports
- [ ] Sub commander
- [ ] Other cli provider, like commander
