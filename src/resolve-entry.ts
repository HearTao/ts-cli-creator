import { Project, SourceFile, ts, ExportedDeclarations, FunctionDeclaration, ParameterDeclaration, Type, InterfaceDeclaration } from 'ts-morph'
import { getJSDoc, getJSDocTag } from './common'

const DEFAULT_EXPORTNAME: string = `default`
const COMMAND_JSDOC_TAG: string = `command`
const OPTIONS_PARAMETER_NAME: string = `options`

export default function resolveEntry(entryPath: string, exportName: string = DEFAULT_EXPORTNAME): [ FunctionDeclaration, InterfaceDeclaration] {
  const project = new Project()
  const sourceFile: SourceFile = project.addExistingSourceFile(entryPath)
  const exportDecls = sourceFile.getExportedDeclarations()
  const getExportDecls = exportDecls.get(exportName)
  if(undefined === getExportDecls || 0 === getExportDecls.length) throw makeDefaultExportNotFoundError(exportName)
  const decl = getExportDecls[0]

  if(!isFunctionDecl(decl)) throw makeExportNotFunctionDeclaration()
  const interfaceDecl = getFirstParamterTypeFromFunctionDecl(decl)

  return [ decl, interfaceDecl ]
}

// interface Commander {
//   positional: []
//   options: InterfaceDeclaration
// }

export function getPositionalAndOptions(decl: FunctionDeclaration) {
  const params: ParameterDeclaration[] = decl.getParameters()
  const lstParam: ParameterDeclaration | undefined = params.pop()
  if(undefined === lstParam) return [ [], ]
  const lstName: string = lstParam.getName()

  let options

  if(OPTIONS_PARAMETER_NAME === lstName) {
    options = getOptionsInterfaceDecl(lstParam)
  } else {
    params.push(lstParam)
  }

  const positionals = getPositional(params)

  return [ positionals, options ]
}

function getOptionsInterfaceDecl(param: ParameterDeclaration) {
  param
}

function getPositional(params: ParameterDeclaration[]) {
  return params.map(param => {
    const name: string = param.getName()
    const type: Type = param.getType()
    const typeNode: ts.Node = transformPositionalTypeNode(type)

    return [ name, { ...typeNode }]
  })
}

function transformPositionalTypeNode(type: Type): ts.Node {
  if(type.isString()) return ts.createStringLiteral(`string`) 
  else if(type.isNumber()) return ts.createStringLiteral(`number`)
  else if(type.isBoolean) return ts.createStringLiteral(`boolean`)
  else throw new Error(`Unsupports type "${type.getText()}"`)
}

export function getCommandFuncDecl(functionDecls: FunctionDeclaration[]): FunctionDeclaration {
  const tagedFuncDecl = getTagedFuncDecl(functionDecls)
  if(null !== tagedFuncDecl) return tagedFuncDecl
  return getDefaultFuncDecl(functionDecls)
}

function getTagedFuncDecl(functionDeclarations: FunctionDeclaration[]): FunctionDeclaration | null {
  const decl: FunctionDeclaration | undefined = functionDeclarations.find(decl => {
    const jsdoc = getJSDoc(decl)
    if(null === jsdoc) return false
    const tag = getJSDocTag(jsdoc, name => COMMAND_JSDOC_TAG === name)
    if(null === tag) return false
    return true
  })
  if(undefined === decl) return null
  return decl
}

function getDefaultFuncDecl(functionDeclarations: FunctionDeclaration[]): FunctionDeclaration {
  const decl: FunctionDeclaration | undefined = functionDeclarations.find(decl => decl.isDefaultExport())
  if(undefined === decl) throw makeDefaultCommandFunctionNotFoundError()
  return decl
}

function getFirstParamterTypeFromFunctionDecl(func: FunctionDeclaration): InterfaceDeclaration {
  const params: ParameterDeclaration[] = func.getParameters()
  if(0 === params.length) throw makeFunctionNoParamsError() 
  const param: ParameterDeclaration = params[0]
  const type = param.getType()
  if(undefined === type) throw makeParamterNoTypeError(param)
  if(!type.isInterface()) throw makeTypeIsNotInterfaceError(type)
  const symbol = type.getSymbol()
  if(undefined === symbol) throw new Error(`symbol`)
  const decl = symbol.getDeclarations()
  if(decl.length === 0) throw new Error(`decl`)
  return (decl[0] as InterfaceDeclaration)
}

function makeTypeIsNotInterfaceError(type: Type): Error {
  return new Error(`Paramter type "${type.getText()}" not a interface declaration`)
}

function makeParamterNoTypeError(param: ParameterDeclaration): Error {
  return new Error(`Paramter "${param.getText()}" not typed`)
}

function makeFunctionNoParamsError(): Error {
  return new Error(`The function have not any params`)
}

function isFunctionDecl(decl: ExportedDeclarations): decl is FunctionDeclaration {
  return ts.SyntaxKind.FunctionDeclaration === decl.getKind()
}

function makeDefaultCommandFunctionNotFoundError(): Error {
  return new Error(`Default command function not found`)
}

function makeDefaultExportNotFoundError(name: string): Error {
  return new Error(`Export not found "${name}"`)
}

function makeExportNotFunctionDeclaration(): Error {
  return new Error(`Export not a function`)
}
