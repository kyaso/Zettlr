import tippy, { followCursor, Instance } from 'tippy.js'
import 'tippy.js/animations/shift-away.css'
import { trans } from '@common/i18n-renderer'
import { IpcRenderer } from 'electron'
import CodeMirror from 'codemirror'
const ipcRenderer = window.ipc
const clipboard = window.clipboard
const config = window.config

let linkTooltip: Instance|undefined

/**
 * A hook for displaying link tooltips which display metadata
 * and content of a file
 *
 * @param   {CodeMirror.Editor}  elem  The instance to attach to
 */

export default function noteTooltipsHook (elem: CodeMirror.Editor): void {
  
  elem.getWrapperElement().addEventListener('mousemove', (event) => {
    if (!config.get('zkn.tooltipEnable')) {
      return
    }

    // Only handle this event when no mouse button was pressed at the
    // same time (e.g. mouse moved while highlighting text)
    if (event.buttons > 0) {
      return
    }

    const a = event.target as HTMLElement

    // Only for note links or tags
    if (!a.classList.contains('cm-zkn-link') && !a.classList.contains('cm-zkn-tag') && !a.classList.contains('cm-zkn-id')) {
      return
    }

    // If there's already a tippy on the instance, don't re-render it
    if (a.hasOwnProperty('_tippy')) {
      return
    }

    // Token hack borrowed from markdown-editor/index.ts.
    // This is a workaround for the Vim normal mode bug
    // where highlighting parts of a ZKN link seems to
    // break up the link into multiple parts...
    let cursor = elem.coordsChar({ left: event.clientX, top: event.clientY })
    let tokenInfo = elem.getTokenAt(cursor)
    let tokenList = tokenInfo.type?.split(' ')
    
    // Return when tokenList is invalid
    if (tokenList === undefined) {
      return
    }

    // Return when we only found "[[" or "]]"
    if (tokenInfo.string === '[[' || tokenInfo.string === ']]') {
      return
    }

    // Determine whether we have a link or a tag
    let isLink = false 
    let isTag = false
    // We do the filtering because (for some reason) sometimes links have class
    // "zkn-link", and sometimes "zkn-link-formatting" -> so we just test for
    // "zkn-link".
    // Similar story for tags below
    if (tokenList.filter( (token) => token.includes('zkn-link') ).length > 0) {
      isLink = true
    } else if (tokenList.filter( (token) => token.includes('zkn-tag') ).length > 0) {
      isTag = true
    } else if (tokenList.filter( (token) => token.includes('zkn-id') ).length > 0) {
      isTag = true
    }

    // Neither link, nor tag -> abort
    if (!isLink && !isTag) {
      return
    }

    // Hide any existing tooltip
    maybeHideLinkTooltip()

    // Create a tippy. This will display the loading values
    linkTooltip = tippy(a, {
      content: trans('gui.preview_searching_label'),
      theme: 'myTheme',
      allowHTML: true, // Obviously
      interactive: true,
      animation: 'shift-away',
      placement: 'top', // Display at the beginning of the anchor
      followCursor: 'horizontal',
      appendTo: document.body, // anchor
      showOnCreate: true, // Immediately show the tooltip
      arrow: true, // Arrow for these tooltips
      onHidden: (instance) => {
        if (linkTooltip !== undefined) {
          linkTooltip.destroy()
          linkTooltip = undefined
        }
      },
      delay: config.get('zkn.tooltipDelay'),
      plugins: [followCursor]
    })

    // Find the file
    ipcRenderer.invoke('application', { command: 'file-find-and-return-meta-data', payload: tokenInfo.string })
      .then((metaData) => {
        // Set the tooltip's contents to the note contents
        const wrapper = getPreviewElement(metaData, tokenInfo.string, isLink)

        ;(linkTooltip as Instance).setContent(wrapper)

        // We now destroy the tooltips directly in the buttons event handlers
        // Also, destroy the tooltip as soon as the button is clicked to
        // prevent visual artifacts
        // wrapper.querySelector('#open-note')?.addEventListener('click', (event) => {
        //   // took this from formatting-bar.ts (TS complained about possible undefined)
        //   ;(linkTooltip as Instance).destroy()
        //   linkTooltip = undefined
        // })
        // wrapper.querySelector('#copy-id')?.addEventListener('click', (event) => {
        //   ;(linkTooltip as Instance).destroy()
        //   linkTooltip = undefined
        // })
      }).catch(err => console.error(err))
  })
}

/**
 * Generates the full wrapper element for displaying file information in a
 * tippy tooltip.
 *
 * @param   {string[]}  metadata      The note metadata
 * @param   {string}    linkContents  The link contents (used for navigation)
 *
 * @return  {Element}                 The wrapper element
 */
function getPreviewElement (metadata: [string, string, number, number], linkContents: string, isLink: Boolean): HTMLDivElement {
  const wrapper = document.createElement('div')
  wrapper.classList.add('editor-note-preview')

  const linkIsFile = isLink && (metadata !== undefined)
  const title: HTMLHeadingElement = getTitle(linkIsFile ? metadata[0] : linkContents)

  wrapper.appendChild(title)

  // When the link is an actual file, show also the directory.
  if (linkIsFile) {
    const dir = document.createElement('span')
    dir.setAttribute('id', 'zkn-link-tooltip-dir')
    // If we set the styles here, they can't be overridden using custom.css!
    // dir.style.fontSize = 'small'
    // dir.style.color = 'grey'
    dir.textContent = metadata[1]

    wrapper.appendChild(dir)
  }

  // const content = document.createElement('div')
  // content.classList.add('note-content')
  // content.textContent = metadata[1]

  // const meta = document.createElement('div')
  // meta.classList.add('metadata')
  // meta.innerHTML = `${trans('gui.preview_word_count')}: ${metadata[2]}`
  // meta.innerHTML += '<br>'
  // meta.innerHTML += `${trans('gui.modified')}: ${formatDate(metadata[3])}`

  // Create a div for the buttons
  const actions = document.createElement('div')
  actions.classList.add('actions')
  // Center horizontal (source: https://stackoverflow.com/a/7560887/3727722)
  actions.style.display = 'flex'
  actions.style.justifyContent = 'center'

  // Create a "Search" button
  const searchButton = getSearchButton(linkContents, isLink)
  searchButton.style.marginRight = '10px'
  actions.appendChild(searchButton)

  // If it is a file, add an "Open" button
  if (linkIsFile) {
    const openButton = getOpenButton(linkContents)
    openButton.style.marginRight = '10px'
    actions.appendChild(openButton)
  }

  // Finally, add the copy button
  const copyButton = getCopyButton(linkContents, isLink)
  actions.appendChild(copyButton)

  // Only if preference "Avoid New Tabs" is set,
  // offer an additional button on preview tooltip
  // to open the file in a new tab
  if (window.config.get('system.avoidNewTabs') === true) {
    const openFuncNewTab = function (): void {
      ipcRenderer.invoke('application', {
        command: 'force-open',
        payload: {
          linkContents: linkContents,
          newTab: true
        }
      })
        .catch(err => console.error(err))
    }

    const openButtonNT = document.createElement('button')
    openButtonNT.setAttribute('id', 'open-note-new-tab')
    openButtonNT.textContent = trans('menu.open_new_tab')
    openButtonNT.addEventListener('click', openFuncNewTab)
    openButtonNT.style.marginLeft = '10px'
    actions.appendChild(openButtonNT)
  }

  // wrapper.appendChild(title) // -> Moved to above
  // wrapper.appendChild(content)
  // wrapper.appendChild(meta)
  wrapper.appendChild(actions)

  return wrapper
}

/**
 * Basically destroys the tooltip if it exists already
 */
function maybeHideLinkTooltip (): void {
  if (linkTooltip !== undefined) {
    linkTooltip.destroy()
    linkTooltip = undefined
  }
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
        linkContents: linkContents,
        newTab: undefined // let open-file command decide based on preferences
      }
    })
      .catch(err => console.error(err))
    
    ipcRenderer.invoke('application', {
      command: 'start-global-search',
      payload: linkContents
    })
      .catch(err => console.error(err))
    
    // Destroy the tooltip instance
    maybeHideLinkTooltip()
  }

  const openButton = document.createElement('button')
  openButton.setAttribute('id', 'open-note')
  openButton.innerHTML = '<clr-icon shape="pop-out"></clr-icon>'
  openButton.addEventListener('click', openFunc)

  return openButton
}

/**
 * Returns a "Search" button
 * @param linkContents link content
 * @returns 
 */
function getSearchButton (linkContents: String, isLink: Boolean): HTMLButtonElement {
  const searchFunc = function (): void {
    // Copy
    if (window.config.get('zkn.copyOnClick')) {
      copy(linkContents as string, isLink)
    }

    ipcRenderer.invoke('application', {
      command: 'start-global-search',
      payload: linkContents
    })
      .catch(err => console.error(err))
    
    // Destroy the tooltip instance
    maybeHideLinkTooltip()
  }

  const searchButton = document.createElement('button')
  searchButton.setAttribute('id', 'search-id')
  searchButton.innerHTML = '<clr-icon shape="search"></clr-icon>'
  searchButton.addEventListener('click', searchFunc)

  return searchButton 
}

/**
 * Returns a "Copy" button
 * @param linkContents link content
 * @returns 
 */
function getCopyButton (linkContents: String, isLink: Boolean): HTMLButtonElement {
  const copyID = function (): void {
    copy(linkContents as string, isLink)

    // Destroy the tooltip instance
    maybeHideLinkTooltip()
  }

  const copyButton = document.createElement('button')
  copyButton.setAttribute('id', 'copy-id')
  copyButton.innerHTML = '<clr-icon shape="copy"></clr-icon>'
  copyButton.addEventListener('click', copyID) 

  return copyButton
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

function copy (text: string, isLink: Boolean): void {
  clipboard.writeText(isLink ? '[[' + text + ']]' : text)
}