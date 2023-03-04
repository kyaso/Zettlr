/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        updateOutboundLinksAction
 * CVM-Role:        Controller
 * Maintainer:      Kirthihan Yasotharan
 * License:         GNU GPL v3
 *
 * Description:     Updates the list of outbound links
 *
 * END HEADER
 */

import { OpenDocument } from '@dts/common/documents'
import { MDFileDescriptor } from '@dts/common/fsal'
import { OutboundLink } from '@dts/renderer/misc'
import { hasMarkdownExt } from '@providers/fsal/util/is-md-or-code-file'
import { ActionContext } from 'vuex'
import { ZettlrState } from '..'

const path = window.path
const ipcRenderer = window.ipc

export default async function (context: ActionContext<ZettlrState, ZettlrState>): Promise<void> {
  console.log('updateOutboundLinks')
  const activeFile: OpenDocument | null = context.getters.lastLeafActiveFile()
  if (activeFile === null || !hasMarkdownExt(activeFile.path)) {
    context.commit('updateOutboundLinks', [])
    return
  }

  const outboundLinks: OutboundLink[] = []

  // Get ALL (= file + non-file) outbound links
  const { links } = await ipcRenderer.invoke('link-provider', {
    command: 'get-all-outbound-links',
    payload: { filePath: activeFile.path }
  }) as { links: string[] }

  // For each outbound link, get the list of files that also contain that link
  for (const link of links) {
    let { files } = await ipcRenderer.invoke('link-provider', {
      command: 'get-files-with-link',
      payload: { link }
    }) as { files: string[] }

    // Remove the active file from the list of files
    files = files.filter((file) => file !== activeFile.path)

    // Get the target file path in case the link points to an actual file
    let descriptor = await ipcRenderer.invoke('application', {
      command: 'find-exact',
      payload: link
    }) as MDFileDescriptor | undefined

    outboundLinks.push(
      {
        link,
        targetFilePath: descriptor?.path,
        files,
        hideFileSet: false
      }
    )
  }

  // Sort so that links with more files are shown at the top
  outboundLinks.sort((a, b) => (b.files.length - a.files.length))

  // console.log('Update outbound links for file ', activeFile.path, ':')
  // for (const link of outboundLinks) {
  //   console.log('Link: ', link.link)
  //   console.info('Files: ', link.files)
  // }
  context.commit('updateOutboundLinks', outboundLinks)
}
