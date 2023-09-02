/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Formatting Toolbar
 * CVM-Role:        Extension
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This extension can display a formatting bar for selections.
 *
 * END HEADER
 */

import { showTooltip, type Tooltip } from '@codemirror/view'
import { type EditorState, StateField } from '@codemirror/state'
import { applyBold, applyCode, applyComment, applyItalic, applyZknLink, insertImage, insertLink } from '../commands/markdown'
import { trans } from '@common/i18n-renderer'
import { copyAsPlain } from '../util/copy-paste-cut'

function getToolbar (state: EditorState): Tooltip[] {
  const mainSel = state.selection.main
  if (mainSel.empty) {
    return []
  }

  // Bold | Italic | Link | Image | Comment | Code  ̣| Wikilink | Copy

  return [{
    pos: mainSel.head,
    above: mainSel.head < mainSel.anchor,
    strictSide: false,
    arrow: true,
    create: (view) => {
      const dom = document.createElement('div')
      dom.className = 'cm-formatting-bar'

      const buttonWrapper = document.createElement('div')
      buttonWrapper.className = 'button-wrapper'

      const bold = document.createElement('button')
      bold.classList.add('formatting-toolbar-button')
      bold.setAttribute('title', trans('Bold'))
      bold.innerHTML = '<cds-icon shape="bold"></cds-icon>'

      const italic = document.createElement('button')
      italic.classList.add('formatting-toolbar-button')
      italic.setAttribute('title', trans('Italics'))
      italic.innerHTML = '<cds-icon shape="italic"></cds-icon>'

      const link = document.createElement('button')
      link.classList.add('formatting-toolbar-button')
      link.setAttribute('title', trans('Link'))
      link.innerHTML = '<cds-icon shape="link"></cds-icon>'

      // const image = document.createElement('button')
      // image.classList.add('formatting-toolbar-button')
      // image.setAttribute('title', trans('Image'))
      // image.innerHTML = '<cds-icon shape="image"></cds-icon>'

      // const comment = document.createElement('button')
      // comment.classList.add('formatting-toolbar-button')
      // comment.setAttribute('title', trans('Comment'))
      // comment.innerHTML = '<cds-icon shape="code-alt"></cds-icon>'

      const code = document.createElement('button')
      code.classList.add('formatting-toolbar-button')
      code.setAttribute('title', trans('Code'))
      code.innerHTML = '<cds-icon shape="code"></cds-icon>'

      const zknlink = document.createElement('button')
      zknlink.classList.add('formatting-toolbar-button')
      zknlink.setAttribute('title', trans('Wikilink'))
      zknlink.innerHTML = '<cds-icon shape="angle-double"></cds-icon>'

      const copy = document.createElement('button')
      copy.classList.add('formatting-toolbar-button')
      copy.setAttribute('title', trans('Copy'))
      copy.innerHTML = '<cds-icon shape="copy"></cds-icon>'

      buttonWrapper.append(copy, bold, italic, link, /* image, comment, */ code, zknlink)
      dom.append(buttonWrapper)

      // NOTE: We need to use the onmousedown event here, since the click only
      // triggers after onmouseup, and by that time the editor has gone through
      // a transaction cycle that has re-rendered the tooltip.
      bold.onmousedown = function (event) { applyBold(view) }
      italic.onmousedown = function (event) { applyItalic(view) }
      link.onmousedown = function (event) { insertLink(view) }
      // image.onmousedown = function (event) { insertImage(view) }
      // comment.onmousedown = function (event) { applyComment(view) }
      code.onmousedown = function (event) { applyCode(view) }
      zknlink.onmousedown = function (event) { applyZknLink(view) }
      copy.onmousedown = function (event) { copyAsPlain(view) }

      return { dom }
    }
  }]
}

export const formattingToolbar = StateField.define<readonly Tooltip[]>({
  create (state) {
    return getToolbar(state)
  },

  update (tooltips, transaction) {
    return getToolbar(transaction.state)
  },

  provide: f => showTooltip.computeN([f], state => state.field(f))
})
