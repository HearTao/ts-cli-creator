import { JSDocableNode, JSDoc, JSDocTag } from "ts-morph"

export function getJSDoc(node: JSDocableNode): JSDoc | null{
  const jsdocs = node.getJsDocs()
  const len = jsdocs.length
  if(0 === len) return null
  return jsdocs[len - 1]
}

export function getJSDocTags(jsdoc: JSDoc, predicate: string | ((name: string) => boolean)): JSDocTag[] | null {
  const tags = jsdoc.getTags()
  const res: JSDocTag[] = tags.map(tag => {
    const name: string = stringifyJSDocTag(tag)
    if(`function` === typeof predicate) {
      return predicate(name) ? tag : null
    } else return predicate === name ? tag : null
  }).filter((name): name is JSDocTag => null !== name)
  if(0 === res.length) return null
  return res
}

export function getJSDocTag(jsdoc: JSDoc, predicate: string | ((name: string) => boolean)): JSDocTag | null {
  const tags = getJSDocTags(jsdoc, predicate) 
  return null === tags ? null : tags[0]
}

export function stringifyJSDocTag(tag: JSDocTag): string {
  return tag.getText().replace(/^@/, '').trim()
}
