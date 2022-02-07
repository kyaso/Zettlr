import tippy, { followCursor } from 'tippy.js'
import { trans } from '@common/i18n-renderer'
import formatDate from '@common/util/format-date'
import { IpcRenderer } from 'electron'
import CodeMirror from 'codemirror'
const ipcRenderer: IpcRenderer = (window as any).ipc
const clipboard = (window as any).clipboard

/**
 * A hook for displaying link tooltips which display metadata
 * and content of a file
 *
 * @param   {CodeMirror.Editor}  elem  The instance to attach to
 */

export default function noteTooltipsHook (elem: CodeMirror.Editor): void {
  
  elem.getWrapperElement().addEventListener('mousemove', (event) => {
    if (!global.config.get('zkn.tooltipEnable')) {
      return
    }

    const a = event.target as HTMLElement

    // Only for note links
    if (!a.classList.contains('cm-zkn-link')) {
      return
    }

    // If there's already a tippy on the instance, don't re-render it
    if (a.hasOwnProperty('_tippy')) {
      return
    }

    // Create a tippy. This will display the loading values
    const tooltip = tippy(a, {
      content: trans('gui.preview_searching_label'),
      allowHTML: true, // Obviously
      interactive: true,
      placement: 'top', // Display at the beginning of the anchor
      followCursor: 'horizontal',
      appendTo: document.body, // anchor
      showOnCreate: true, // Immediately show the tooltip
      arrow: true, // Arrow for these tooltips
      onHidden (instance) {
        instance.destroy() // Destroy the tippy instance.
      },
      delay: global.config.get('zkn.tooltipDelay'),
      plugins: [followCursor]
    })

    // Find the file
    ipcRenderer.invoke('application', { command: 'file-find-and-return-meta-data', payload: a.innerText })
      .then((metaData) => {
        // Set the tooltip's contents to the note contents
        const wrapper = getPreviewElement(metaData, a.innerText)

        tooltip.setContent(wrapper)

        // Also, destroy the tooltip as soon as the button is clicked to
        // prevent visual artifacts
        wrapper.querySelector('#open-note')?.addEventListener('click', (event) => {
          tooltip.destroy()
        })
        wrapper.querySelector('#copy-id')?.addEventListener('click', (event) => {
          tooltip.destroy()
        })
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
function getPreviewElement (metadata: [string, string, number, number], linkContents: string): HTMLDivElement {
  const wrapper = document.createElement('div')
  wrapper.classList.add('editor-note-preview')

  let openButtonTxt = 'Search'
  // When the link is an actual file, add its title.
  // Otherwise (ID) do nothing
  if (metadata !== null) {
    const title = document.createElement('h4')
    title.classList.add('filename')
    title.textContent = metadata[0]

    openButtonTxt = trans('menu.open').replace('\u2026', '') // remove "...", if any

    wrapper.appendChild(title)
  }

  // const content = document.createElement('div')
  // content.classList.add('note-content')
  // content.textContent = metadata[1]

  // const meta = document.createElement('div')
  // meta.classList.add('metadata')
  // meta.innerHTML = `${trans('gui.preview_word_count')}: ${metadata[2]}`
  // meta.innerHTML += '<br>'
  // meta.innerHTML += `${trans('gui.modified')}: ${formatDate(metadata[3])}`

  const actions = document.createElement('div')
  actions.classList.add('actions')
  // Center horizontal (source: https://stackoverflow.com/a/7560887/3727722)
  actions.style.display = 'flex'
  actions.style.justifyContent = 'center'

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
  }

  const openButton = document.createElement('button')
  openButton.setAttribute('id', 'open-note')
  openButton.innerHTML = openButtonTxt + ' <clr-icon shape="pop-out"></clr-icon>'
  openButton.addEventListener('click', openFunc)
  actions.appendChild(openButton)

  // Copy ID button
  const copyID = function (): void {
    clipboard.writeText('[[' + linkContents + ']]')
  }

  const copyButton = document.createElement('button')
  copyButton.setAttribute('id', 'copy-id')
  copyButton.innerHTML = '<clr-icon shape="copy"></clr-icon>'
  copyButton.style.marginLeft = '10px'
  copyButton.addEventListener('click', copyID)
  actions.appendChild(copyButton)

  // Only if preference "Avoid New Tabs" is set,
  // offer an additional button on preview tooltip
  // to open the file in a new tab
  if (global.config.get('system.avoidNewTabs')) {
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
