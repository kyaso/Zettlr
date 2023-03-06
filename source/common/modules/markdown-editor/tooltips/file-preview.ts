/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        File Preview tooltip
 * CVM-Role:        Extension
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This extension displays a file preview on Zettelkasten-link
 *                  hover.
 *
 * END HEADER
 */

import { EditorView, hoverTooltip, Tooltip } from '@codemirror/view'
import { MDFileDescriptor } from '@dts/common/fsal'
import { getSearchButton, getCopyButton } from './common'

const ipcRenderer = window.ipc

// [ file.name, preview, file.wordCount, file.modtime ]
// type IpcResult = undefined|[string, string, number, number]

// Previews files with tooltips
async function filePreviewTooltip (view: EditorView, pos: number, side: 1 | -1): Promise<Tooltip|null> {
  const { from, text } = view.state.doc.lineAt(pos)

  // Ensure there is an internal link opening before pos, but not closing, and
  // that there is an internal link closing after pos, but not opening.
  const sliceBefore = text.substring(0, pos - from)
  const sliceAfter = text.substring(pos - from)
  const openLinkBeforePos = sliceBefore.includes('[[') && sliceBefore.lastIndexOf('[[') > sliceBefore.lastIndexOf(']]')
  const closeLinkAfterPos = sliceAfter.includes(']]') && sliceAfter.indexOf(']]') < sliceAfter.indexOf('[[')

  if (!openLinkBeforePos && !closeLinkAfterPos) {
    return null
  }

  // Extract the relative start and end positions, and do a sanity test
  const start = sliceBefore.lastIndexOf('[[') + 2
  const end = text.indexOf(']]', pos - from)

  if (pos > from + end || pos < from + start) {
    return null
  }

  const fileToDisplay = text.substring(start, end)

  const desc: MDFileDescriptor = await ipcRenderer.invoke(
    'application',
    { command: 'find-exact', payload: fileToDisplay }
  )

  // By annotating a range (providing `end`) the hover tooltip will stay as long
  // as the user is somewhere over the links
  return {
    pos: from + start,
    end: pos + end + 2,
    above: true,
    create (view) {
      return { dom: getPreviewElement(desc, fileToDisplay) }
    }
  }
}

/**
 * Generates the full wrapper element for displaying file information in a
 * tippy tooltip.
 *
 * @param   {MDFileDescriptor}  desc  A file descriptor
 * @param   {string}    linkContents  The link contents (used for navigation)
 *
 * @return  {Element}                 The wrapper element
 */
function getPreviewElement (desc: MDFileDescriptor|undefined, linkContents: string): HTMLDivElement {
  const wrapper = document.createElement('div')
  wrapper.classList.add('editor-note-preview')

  const linkIsFile = (desc !== undefined)
  const title: HTMLHeadingElement = getTitle(linkIsFile ? desc.name : linkContents)

  wrapper.appendChild(title)

  // When the link is an actual file, show also the directory.
  if (linkIsFile) {
    const dir = document.createElement('span')
    dir.setAttribute('id', 'zkn-link-tooltip-dir')
    // If we set the styles here, they can't be overridden using custom.css!
    // dir.style.fontSize = 'small'
    // dir.style.color = 'grey'
    dir.textContent = desc.path

    wrapper.appendChild(dir)
  }

  // Create a div for the buttons
  const actions = document.createElement('div')
  actions.classList.add('actions')
  // Center horizontal (source: https://stackoverflow.com/a/7560887/3727722)
  actions.style.display = 'flex'
  actions.style.justifyContent = 'center'

  // Create a "Search" button
  const searchButton = getSearchButton(linkContents, true)
  actions.appendChild(searchButton)

  // Add the copy button
  const copyButton = getCopyButton(linkContents, true)
  copyButton.style.marginLeft = '10px'
  actions.appendChild(copyButton)

  // If it is a file, add an "Open" button
  if (linkIsFile) {
    const openButton = getOpenButton(linkContents)
    openButton.style.marginLeft = '10px'
    actions.appendChild(openButton)
  }

  // Only if preference "Avoid New Tabs" is set,
  // offer an additional button on preview tooltip
  // to open the file in a new tab
  if (linkIsFile && window.config.get('system.avoidNewTabs') === true) {
    const openFuncNewTab = function (): void {
      ipcRenderer.invoke('application', {
        command: 'force-open',
        payload: {
          linkContents,
          newTab: true
        }
      })
        .catch(err => console.error(err))

      ipcRenderer.invoke('application', {
        command: 'start-global-search',
        payload: linkContents
      })
        .catch(err => console.error(err))
    }

    const openButtonNT = document.createElement('button')
    openButtonNT.setAttribute('id', 'open-note-new-tab')
    // openButtonNT.textContent = trans('menu.open_new_tab')
    openButtonNT.innerHTML = '<cds-icon shape="pop-out"></cds-icon>'
    openButtonNT.addEventListener('click', openFuncNewTab)
    openButtonNT.style.marginLeft = '10px'
    actions.appendChild(openButtonNT)
  }

  wrapper.appendChild(actions)

  return wrapper
}

/**
 * Returns an "Open" note button
 * @param linkContents link content
 * @returns
 */
function getOpenButton (linkContents: String): HTMLButtonElement {
  const openFunc = function (): void {
    ipcRenderer.invoke('application', {
      command: 'force-open',
      payload: {
        linkContents,
        newTab: undefined // let open-file command decide based on preferences
      }
    })
      .catch(err => console.error(err))

    ipcRenderer.invoke('application', {
      command: 'start-global-search',
      payload: linkContents
    })
      .catch(err => console.error(err))
  }

  const openButton = document.createElement('button')
  openButton.setAttribute('id', 'open-note')
  openButton.innerHTML = '<cds-icon shape="arrow" style="transform: rotate(45deg);"></cds-icon>'
  openButton.addEventListener('click', openFunc)

  return openButton
}

/**
 * Returns a title element
 * @param title Title
 * @returns
 */
function getTitle (title: string): HTMLHeadingElement {
  const heading = document.createElement('h3')
  heading.setAttribute('id', 'zkn-link-tooltip-title')
  heading.textContent = title

  return heading
}

export const filePreview = hoverTooltip(filePreviewTooltip, { hoverTime: window.config.get('zkn.tooltipDelay') })
