/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Inline code tooltip
 * CVM-Role:        Extension
 * Maintainer:      Kirthihan Yasotharan
 * License:         GNU GPL v3
 *
 * Description:     This extension displays a tooltip on inline code hover.
 *
 * END HEADER
 */

import { syntaxTree } from '@codemirror/language'
import { type EditorView, hoverTooltip, type Tooltip } from '@codemirror/view'
import { getSearchButton, getCopyButton } from './common'

async function inlineCodeTooltip (view: EditorView, pos: number): Promise<Tooltip|null> {
  const nodeAt = syntaxTree(view.state).resolve(pos, 0)

  // Walk up to the InlineCode parent if we're on a child node (e.g. CodeMark/CodeText)
  const inlineCodeNode = nodeAt.type.name === 'InlineCode'
    ? nodeAt
    : nodeAt.parent?.type.name === 'InlineCode'
      ? nodeAt.parent
      : null

  if (inlineCodeNode === null) {
    return null
  }

  // Exclude inline math nodes (which reuse the InlineCode node type)
  const firstChar = view.state.sliceDoc(inlineCodeNode.from, inlineCodeNode.from + 1)
  if (firstChar === '$') {
    return null
  }

  // Extract only the code content (without surrounding backtick delimiters) by
  // looking for the CodeText child node.
  let codeContent: string | null = null
  let child = inlineCodeNode.firstChild
  while (child !== null) {
    if (child.type.name === 'CodeText') {
      codeContent = view.state.sliceDoc(child.from, child.to)
      break
    }
    child = child.nextSibling
  }

  // Fall back to stripping the outer backtick characters if no CodeText child
  // was found (shouldn't normally happen, but be safe).
  if (codeContent === null) {
    const full = view.state.sliceDoc(inlineCodeNode.from, inlineCodeNode.to)
    codeContent = full.replace(/^`+|`+$/g, '')
  }

  const content = codeContent

  return {
    pos: inlineCodeNode.from,
    end: inlineCodeNode.to,
    above: true,
    create () {
      return { dom: getTooltipElement(content) }
    }
  }
}

function getTooltipElement (codeContent: string): HTMLDivElement {
  const wrapper = document.createElement('div')
  wrapper.classList.add('editor-note-preview')

  const actions = document.createElement('div')
  actions.classList.add('actions')
  actions.style.display = 'flex'
  actions.style.justifyContent = 'center'

  const searchButton = getSearchButton(codeContent, false)
  actions.appendChild(searchButton)

  const copyButton = getCopyButton(`\`${codeContent}\``, false)
  copyButton.style.marginLeft = '10px'
  actions.appendChild(copyButton)

  wrapper.appendChild(actions)
  return wrapper
}

export const inlineCodeTooltipExt = hoverTooltip(inlineCodeTooltip, { hoverTime: window.config.get('zkn.tooltipDelay') })
