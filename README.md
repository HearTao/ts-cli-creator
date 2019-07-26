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

function command(options: Partial<Options> = {}): void {
    /* your code here */
}

export default command
```

Generate `cli.ts` file:

```ts
import yargs from 'yargs'
import command, { Options } from './command'

export default function main(): void {
    const args = yargs
        .strict()
        .option('foo', {
            type: string
        })
        .help()
        .alias('help', 'h')
        .argv

    command(args as Options)
}
```

## Generate

### Generate option

**ts-cli** generate option from a interface, see below: 

#### 1. Transform option type

```ts
interface Options {
    foo: string
}
```

Transform to:

```ts
yargs.option(`foo`, {
    type: `string`
})
```

Supports types:

| Typescript Types | Yargs Options |
|------|-------|
| `string` | `{ type: 'string' }` |
| `number` | `{ type: 'number' }` |
| `boolean` | `{ type: 'boolean' }` |
| `string[]` | `{ type: 'string', array: true }` |
| `number[]` | `{ type: 'number', array: true }` |
| `boolean[]` | `{ type: 'boolean', array: true }` |
| `enum E(string iterial)` | `{ type: 'string', choices: [ ...(members of E) ] }` |


#### 2. Transform option description

```ts
interface Options {
    /** A description for foo */
    foo: string
}
```

Transform to:

```ts
yargs.option('foo', {
    type: 'string',
    description: 'A description for foo'
})
```

#### 3. Transform other jsdoc tags to option properties

```ts
interface Options {
    /** 
     * @default 'bar'
     * @baz qux
     */
    foo: string
}
```

Transform to:

```ts
yargs.option('foo', {
    type: 'string',
    default: 'bar',
    baz: 'qux'
})
```
