// TODO KY
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Tag tooltip
 * CVM-Role:        Extension
 * Maintainer:      Kirthihan Yasotharan
 * License:         GNU GPL v3
 *
 * Description:     This extension displays a tooltip on tag
 *                  hover.
 *
 * END HEADER
 */

import { syntaxTree } from '@codemirror/language'
import { EditorView, hoverTooltip, Tooltip } from '@codemirror/view'
import { getSearchButton, getCopyButton } from './common'

async function tagTooltip (view: EditorView, pos: number, side: 1 | -1): Promise<Tooltip|null> {
  const nodeAt = syntaxTree(view.state).resolve(pos, 0)

  if (nodeAt.type.name !== 'ZknTagContent') {
    return null
  }

  const tagContents = view.state.sliceDoc(nodeAt.from, nodeAt.to)

  return {
    pos: nodeAt.from,
    end: nodeAt.to,
    above: true,
    create (view) {
      return { dom: getTooltipElement(tagContents) }
    }
  }
}

function getTooltipElement (tagContents: string): HTMLDivElement {
  const wrapper = document.createElement('div')
  // Use same styling as for file/link tooltip
  wrapper.classList.add('editor-note-preview')

  // Create a div for the buttons
  const actions = document.createElement('div')
  actions.classList.add('actions')
  // Center horizontal (source: https://stackoverflow.com/a/7560887/3727722)
  actions.style.display = 'flex'
  actions.style.justifyContent = 'center'

  // Create a "Search" button
  const searchButton = getSearchButton(tagContents, false)
  actions.appendChild(searchButton)

  // Add the copy button
  const copyButton = getCopyButton(tagContents, false)
  copyButton.style.marginLeft = '10px'
  actions.appendChild(copyButton)

  wrapper.appendChild(actions)
  return wrapper
}

export const tagTooltipExt = hoverTooltip(tagTooltip, { hoverTime: window.config.get('zkn.tooltipDelay') })
