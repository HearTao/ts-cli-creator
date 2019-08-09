import { FunctionDeclaration, SourceFile } from 'ts-morph'
import { getJSDoc, getJSDocTag } from './transformer'

export const COMMAND_JSDOC_TAG = `command`

export default function resolve(sourceFile: SourceFile): FunctionDeclaration {
  const functionDeclarations = sourceFile.getFunctions()
  if(0 === functionDeclarations.length) throw makeNoFunctionError()
  if(1 === functionDeclarations.length) return functionDeclarations[0]
  const exportedFunctionDeclarations = getExportedFunctionDeclarations(functionDeclarations)
  if(0 === exportedFunctionDeclarations.length) throw makeNoExportedFunctionError()
  else if(1 === exportedFunctionDeclarations.length) return exportedFunctionDeclarations[0]
  else return getFunctionDeclaration(exportedFunctionDeclarations)
}

export function makeNoFunctionError(): Error {
  return new Error(`No function declaration found`)
}

export function makeNoExportedFunctionError(): Error {
  return new Error(`No exported function declaration found`)
}

export function getExportedFunctionDeclarations(functionDeclarations: FunctionDeclaration[]): FunctionDeclaration[] {
  return functionDeclarations.filter(decl => decl.isExported())
}

export function getFunctionDeclaration(functionDeclarations: FunctionDeclaration[]): FunctionDeclaration {
  return functionDeclarations.sort(sortFunctionDeclarations)[0]
}

export function sortFunctionDeclarations(prevFunctionDeclaration: FunctionDeclaration, nextFunctionDeclaration: FunctionDeclaration): 1 | 0 | -1 {
  const isPrevDefaultExport = prevFunctionDeclaration.isDefaultExport()
  const isNextDefaultExport = nextFunctionDeclaration.isDefaultExport()
  if(isPrevDefaultExport || isNextDefaultExport) return isPrevDefaultExport ? -1 : 1
  const isPrevHasTag = isTaged(prevFunctionDeclaration)
  const isNextHasTag = isTaged(nextFunctionDeclaration)
  if(isPrevHasTag && isNextHasTag) return 0
  return isPrevHasTag ? -1 : 1
}

export function isTaged(functionDeclaration: FunctionDeclaration): boolean {
  const jsdoc = getJSDoc(functionDeclaration)
  const tag = getJSDocTag(jsdoc, COMMAND_JSDOC_TAG)
  if(undefined === tag) return false
  return true
}
