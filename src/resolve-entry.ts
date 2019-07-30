import { Project, SourceFile, ts, ExportedDeclarations, FunctionDeclaration, ParameterDeclaration, Type, InterfaceDeclaration } from 'ts-morph'

const DEFAULT_EXPORTNAME: string = `default`

export default function resolveEntry(entryPath: string, exportName: string = DEFAULT_EXPORTNAME): [ FunctionDeclaration, InterfaceDeclaration] {
  const project = new Project()
  const sourceFile: SourceFile = project.addExistingSourceFile(entryPath)
  const exportDecls = sourceFile.getExportedDeclarations()
  const getExportDecls = exportDecls.get(exportName)
  if(undefined === getExportDecls || 0 === getExportDecls.length) throw makeExportNotFoundError(exportName)
  const decl = getExportDecls[0]

  if(!isFunctionDecl(decl)) throw makeExportNotFunctionDeclaration()
  const interfaceDecl = getFirstParamterTypeFromFunctionDecl(decl)

  return [ decl, interfaceDecl ]
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

function makeExportNotFoundError(name: string): Error {
  return new Error(`Export not found "${name}"`)
}

function makeExportNotFunctionDeclaration(): Error {
  return new Error(`Export not a function`)
}
