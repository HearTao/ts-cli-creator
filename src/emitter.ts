import * as fs from 'fs'
import * as prompts from 'prompts'
import { highlight } from 'cardinal'
import { defaults } from 'lodash'


interface WriteProcess {
  (path: string, content: string, options: EmitOptions): void | Promise<void>
}

async function writeFS(filePath: string, content: string, options: EmitOptions): Promise<void> {
  if(fs.existsSync(filePath)) {
    if(options.force) {
      reportForceRunWarning()
    } else {
      const answer: boolean = await askForOverrideFileContent()
      if(false === answer) return reportCanceled()
    }
  }

  fs.writeFileSync(filePath, content, `utf-8`)
  reportSuccessful(filePath)
}

function writeLog(_path: string, content: string, options: EmitOptions): void {
  if(options.verbose) reportSummary(options)
  console.log(options.color ? highlight(content) : content)
}

export const enum Writter { FS = 'fs', Log = 'log' }

export const DEFAULT_WRITTER: { [K in Writter]: WriteProcess } = {
  [Writter.FS]: writeFS,
  [Writter.Log]: writeLog
}

export interface EmitOptions {
  verbose: boolean
  force: boolean
  writer: WriteProcess
  color: boolean
  json: boolean
  from: string
  to: string
}

export const DEFAULT_EMITOPTIONS: EmitOptions = {
  verbose: false,
  force: false,
  writer: DEFAULT_WRITTER.log,
  color: true,
  json: false,
  from: `STDIN`,
  to: `STDOUT`
}

export default async function emit(filePath: string, content: string, options: Partial<EmitOptions> = {}): Promise<void> {
  const opts = defaults(options, DEFAULT_EMITOPTIONS)
  const data = options.json ? makeJsonData(content, opts) : content
  await opts.writer(filePath, data, opts)
}

async function askForOverrideFileContent(): Promise<boolean> {
  const res = await prompts({
    type: 'confirm',
    name: 'answer',
    message: `File already exists, would your want to override it?`
  })
  return res.answer
}

function reportCanceled(): void {
  console.warn(`Processing canceled`)
}

function reportForceRunWarning(): void {
  console.warn(`Force override file`)
}

function makeJsonData(content: string, options: EmitOptions): string {
  return JSON.stringify({
    from: options.from,
    to: options.to,
    json: options.json,
    color: options.color,
    content
  }, undefined, `  `)
}

function reportSuccessful(filePath: string): void {
  console.log(`Cli script created successfully`)
  console.log(`Cli writen at "${filePath}"`)
}

function reportSummary(options: EmitOptions): void {
  console.log(`In:  "${options.from}"`)
  console.log(`Out: "${options.to}"`)
}
