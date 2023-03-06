import { copyZknLink } from '@common/util/clipboard'

const ipcRenderer = window.ipc
const clipboard = window.clipboard
const config = window.config

/**
 * Returns a "Search" button
 * @param linkContents link content
 * @returns
 */
export function getSearchButton (linkContents: String, isLink: Boolean): HTMLButtonElement {
  const searchFunc = function (): void {
    // Copy
    if (config.get('zkn.copyOnClick') === true) {
      copy(linkContents as string, isLink)
    }

    ipcRenderer.invoke('application', {
      command: 'start-global-search',
      payload: linkContents
    })
      .catch(err => console.error(err))
  }

  const searchButton = document.createElement('button')
  searchButton.setAttribute('id', 'search-id')
  searchButton.innerHTML = '<cds-icon shape="search"></cds-icon>'
  searchButton.addEventListener('click', searchFunc)

  return searchButton
}

/**
 * Returns a "Copy" button
 * @param linkContents link content
 * @returns
 */
export function getCopyButton (linkContents: String, isLink: Boolean): HTMLButtonElement {
  const copyID = function (): void {
    copy(linkContents as string, isLink)
  }

  const copyButton = document.createElement('button')
  copyButton.setAttribute('id', 'copy-id')
  copyButton.innerHTML = '<cds-icon shape="copy"></cds-icon>'
  copyButton.addEventListener('click', copyID)

  return copyButton
}

function copy (text: string, isLink: Boolean): void {
  if (isLink) {
    copyZknLink(text)
  } else {
    clipboard.writeText(text)
  }
}
