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

import { syntaxTree } from '@codemirror/language'
import { hoverTooltip, EditorView, type Tooltip } from '@codemirror/view'
// import { trans } from '@common/i18n-renderer'
// import { md2html } from '@common/modules/markdown-utils/markdown-to-html'
// import formatDate from '@common/util/format-date'
// import { CITEPROC_MAIN_DB } from '@dts/common/citeproc'
// import sanitizeHtml from 'sanitize-html'
import { getSearchButton, getCopyButton } from './common'
import { type MDFileDescriptor } from '@dts/common/fsal'
import { configField } from '../util/configuration'
import type { FindFileAndReturnMetadataResult } from 'source/app/service-providers/commands/file-find-and-return-meta-data'
import { pathDirname } from 'source/common/util/renderer-path-polyfill'
import makeValidUri from 'source/common/util/make-valid-uri'

const ipcRenderer = window.ipc

// Previews files with tooltips
async function filePreviewTooltip (view: EditorView, pos: number, side: 1 | -1): Promise<Tooltip|null> {
  const nodeAt = syntaxTree(view.state).resolve(pos, side)

  if (![ 'ZknLinkContent', 'ZknLinkPipe', 'ZknLink', 'ZknLinkTitle' ].includes(nodeAt.type.name)) {
    return null
  }

  const wrapperNode = nodeAt.type.name === 'ZknLink' ? nodeAt : nodeAt.parent
  const contentNode = wrapperNode?.getChild('ZknLinkContent')

  if (contentNode == null) {
    return null
  }

  const fileToDisplay = view.state.sliceDoc(contentNode.from, contentNode.to)

  const desc: MDFileDescriptor = await ipcRenderer.invoke(
    'application',
    { command: 'find-exact', payload: fileToDisplay }
  )

  const { zknLinkFormat } = view.state.field(configField)

  // By annotating a range (providing `end`) the hover tooltip will stay as long
  // as the user is somewhere over the links
  return {
    pos: nodeAt.from,
    end: nodeAt.to,
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
 * @return  {Element}                                        The wrapper element
 */
// TODO: desc has different type now
function getPreviewElement (desc: MDFileDescriptor|undefined, linkContents: string): HTMLDivElement {
  const wrapper = document.createElement('div')
  wrapper.classList.add('editor-note-preview')

  const linkIsFile = (desc !== undefined)
  const title: HTMLHeadingElement = getTitle(linkIsFile ? desc.name : linkContents)

  wrapper.appendChild(title)
  // const title = document.createElement('p')
  // title.classList.add('filename')
  // title.textContent = metadata[0]

  // const content = document.createElement('div')
  // content.classList.add('note-content')
  // const html = md2html(metadata[1], window.getCitationCallback(CITEPROC_MAIN_DB))
  // content.innerHTML = sanitizeHtml(html, {
  //   // These options basically translate into: Allow nothing but bare metal tags
  //   allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
  //   disallowedTagsMode: 'escape',
  //   allowedIframeDomains: [],
  //   allowedIframeHostnames: [],
  //   allowedScriptDomains: [],
  //   allowedSchemes: [],
  //   allowedScriptHostnames: [],
  //   allowVulnerableTags: false
  // })

  // When the link is an actual file, show also the directory.
  if (linkIsFile) {
    const dir = document.createElement('span')
    dir.setAttribute('id', 'zkn-link-tooltip-dir')
    // If we set the styles here, they can't be overridden using custom.css!
    // dir.style.fontSize = 'small'
    // dir.style.color = 'grey'
    dir.textContent = desc.path
    dir.style.overflowWrap = 'break-word'

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

  // wrapper.appendChild(title)
  // wrapper.appendChild(document.createElement('hr'))
  // wrapper.appendChild(content)
  // wrapper.appendChild(document.createElement('hr'))
  // wrapper.appendChild(meta)
  wrapper.appendChild(actions)

  return wrapper
}

/**
 * Returns an "Open" note button
 * @param linkContents link content
 * @returns
 */
function getOpenButton (linkContents: string): HTMLButtonElement {
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

export const filePreview = [
  hoverTooltip(filePreviewTooltip, { hoverTime: window.config.get('zkn.tooltipDelay') }),
  // Provide basic styles for these tooltips
  EditorView.baseTheme({
    '.editor-note-preview': {
      maxWidth: '300px',
      padding: '5px',
      fontSize: '80%'
    },
    '.editor-note-preview h1': { fontSize: '100%' },
    '.editor-note-preview h2': { fontSize: '95%' },
    '.editor-note-preview h3': { fontSize: '90%' },
    '.editor-note-preview h4': { fontSize: '80%' },
    '.editor-note-preview h5': { fontSize: '70%' },
    '.editor-note-preview h6': { fontSize: '70%' },
    '.editor-note-preview .note-content': { margin: '10px 0' },
    '.editor-note-preview .metadata': {
      color: 'rgb(200, 200, 200)',
      fontSize: '80%'
    },
    '.editor-note-preview .actions': {
      margin: '5px 0'
    }
  })
]
