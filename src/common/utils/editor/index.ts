import { getSchema } from '@tiptap/core'
import Blockquote from '@tiptap/extension-blockquote'
import Bold from '@tiptap/extension-bold'
import BulletList from '@tiptap/extension-bullet-list'
import Code from '@tiptap/extension-code'
import CodeBlock from '@tiptap/extension-code-block'
import Document from '@tiptap/extension-document'
import HardBreak from '@tiptap/extension-hard-break'
import Heading from '@tiptap/extension-heading'
import HorizontalRule from '@tiptap/extension-horizontal-rule'
import Italic from '@tiptap/extension-italic'
import ListItem from '@tiptap/extension-list-item'
import OrderedList from '@tiptap/extension-ordered-list'
import Paragraph from '@tiptap/extension-paragraph'
import Strike from '@tiptap/extension-strike'
import Text from '@tiptap/extension-text'
import { DOMParser, DOMSerializer, Node } from '@tiptap/pm/model'
import { createHTMLDocument, parseHTML, VHTMLDocument } from 'zeed-dom'

import { FigureAudio, FigureEmbed, FigureImage, Link } from './extensions'

const extensions = [
  Document,
  Paragraph,
  Text,
  Heading.configure({
    levels: [2, 3],
  }),
  OrderedList,
  ListItem,
  BulletList,
  Strike,
  Italic,
  Bold,
  Code,
  CodeBlock,
  Blockquote,
  HardBreak,
  HorizontalRule,
  // Custom
  Link,
  FigureImage,
  FigureAudio,
  FigureEmbed,
  // Mention.configure({
  //   suggestion: mentionSuggestion,
  // }),
]

export function normalizeHTML(html: string): string {
  const schema = getSchema(extensions)
  const dom = parseHTML(html) as unknown as Node
  // @ts-ignore
  const doc = DOMParser.fromSchema(schema).parse(dom).toJSON()
  const contentNode = Node.fromJSON(schema, doc)

  const document = DOMSerializer.fromSchema(schema).serializeFragment(
    contentNode.content,
    {
      document: createHTMLDocument() as unknown as Document,
    }
  ) as unknown as VHTMLDocument

  return document.render()
}
