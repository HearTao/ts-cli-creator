import * as fs from 'fs'
import * as path from 'path'
import * as prompts from 'prompts'

interface WriteProcess {
  (path: string, content: string): void
}

export interface EmitOptions {
  cwd: string
  dryrun: boolean
  silent: boolean
  force: boolean
  writer: WriteProcess | null
}

export const DEFAULT_EMITOPTIONS: EmitOptions = {
  cwd: process.cwd(),
  dryrun: false,
  silent: false,
  force: false,
  writer: null
}

export default async function emit(filePath: string, content: string, options: Partial<EmitOptions> = {}): Promise<void> {
  const { cwd, dryrun, silent, force, writer } = { ...DEFAULT_EMITOPTIONS, ...options }
  const fileAbsolutePath: string = path.isAbsolute(filePath) ? filePath : path.resolve(cwd, filePath)
  
  if(fs.existsSync(fileAbsolutePath) && false === force) {
    if(force) {
      reportForceRunWarning()
    } else {
      const answer: boolean = await askForOverrideFileContent()
      if(false === answer) return !silent ? reportCanceled() : void 0
    }
  }

  const proc: WriteProcess = writer || (dryrun ? DEFAULT_WRITTER.log : DEFAULT_WRITTER.fs)
  try {
    proc(filePath, content)
    if(!silent) reportSuccessful(filePath)
  } catch(e) {
    if(!silent) reportFailed(filePath, e)
  }
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
  console.log(`Canceled`)
}

function reportForceRunWarning(): void {
  console.warn(`Force override file`)
}

function reportSuccessful(filePath: string): void {
  console.log(`Cli script created successful at "${filePath}"`)
}

function reportFailed(filePath: string, error: Error): void {
  console.log(`Cli script created failed at "${filePath}"\n`)
  console.error(error)
}

function writeFS(path: string, content: string): void {
  fs.writeFileSync(path, content, `utf-8`)
}

function writeLog(path: string, content: string): void {
  console.log(`Write Path: ${path}`)
  console.log(`Write Content: \n\n${content}`)
}

const enum Writter { FS = 'fs', Log = 'log' }

const DEFAULT_WRITTER: { [K in Writter]: WriteProcess } = {
  [Writter.FS]: writeFS,
  [Writter.Log]: writeLog
}
