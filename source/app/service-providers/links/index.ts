/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        LinkProvider class
 * CVM-Role:        Service Provider
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Handles links back and forth
 *
 * END HEADER
 */

import { ipcMain } from 'electron'
import broadcastIpcMessage from '@common/util/broadcast-ipc-message'
import ProviderContract from '../provider-contract'
import type LogProvider from '@providers/log'
import type WorkspaceProvider from '@providers/workspaces'
import { WORKSPACE_PROVIDER_EVENTS } from '@providers/workspaces'
import path from 'path'

import path from 'path'

/**
 * This class manages the coloured tags of the app. It reads the tags on each
 * start of the app and writes them after they have been changed.
 */
export default class LinkProvider extends ProviderContract {
  private _fileLinkDatabase: Map<string, string[]>
  private _idDatabase: Map<string, string>

  /**
   * Create the instance on program start and initially load the tags.
   */
  constructor (private readonly _logger: LogProvider, private readonly _workspaces: WorkspaceProvider) {
    super()

    this._fileLinkDatabase = new Map()
    this._idDatabase = new Map()
    // TODO: Add a set of duplicate IDs so we can inform the user so they can
    // fix this

    ipcMain.handle('link-provider', (event, message) => {
      const { command } = message

      if (command === 'get-inbound-links') {
        // Return whatever links to the given file
        const { filePath } = message.payload
        return {
          inbound: this.retrieveInbound(filePath),
          outbound: this.retrieveOutbound(filePath)
        }
      } else if (command === 'get-link-database') {
        // NOTE: We need to compact the Map into something JSONable
        return Object.fromEntries(this._fileLinkDatabase)
      } else if (command === 'get-files-with-link') {
        const { link } = message.payload
        return {
          files: this.retrieveFilesWithLink(link)
        }
      } else if (command === 'get-non-file-links') {
        const { filePath } = message.payload
        return {
          links: this.retrieveNonFileLinks(filePath)
        }
      } else if (command === 'get-all-outbound-links') {
        const { filePath } = message.payload
        return {
          links: this.retrieveAllOutboundLinks(filePath)
        }
      }
    })
  }

  public async boot (): Promise<void> {
    // Listen to state changes within the Workspaces Provider
    this._workspaces.on(WORKSPACE_PROVIDER_EVENTS.WorkspaceChanged, (which) => {
      // Some workspace has changed, so simply pull in the new map
      this._fileLinkDatabase = this._workspaces.getLinks()
      this._idDatabase = this._workspaces.getIds()
      // TODO: That can actually be determined fully with the workspaces events
      // i.e., we don't have to emit this here!
      broadcastIpcMessage('links')
    })

    // Pull in the initial update
    this._fileLinkDatabase = this._workspaces.getLinks()
    this._idDatabase = this._workspaces.getIds()
  }

  /**
   * Shuts down the service provider
   * @return {Boolean} Returns true after successful shutdown
   */
  async shutdown (): Promise<void> {
    this._logger.verbose('Link provider shutting down ...')
  }

  /**
   * Retrieves a set of links to the file given as argument
   *
   * @param   {string}    sourceFilePath  The source file's path
   *
   * @return  {string[]}                  A list of all files linking to sourceFile
   */
  retrieveInbound (sourceFilePath: string): string[] {
    const id = this._idDatabase.get(sourceFilePath)

    if (id === undefined) {
      return [] // Not part of the ID map
    }

    const sourceFiles: string[] = []

    const linkWithExt = path.basename(sourceFilePath)
    const linkWoExt = path.basename(sourceFilePath, path.extname(sourceFilePath))

    // Search all recorded links
    for (const [ file, outbound ] of this._fileLinkDatabase.entries()) {
      if (outbound.includes(id) || outbound.includes(linkWithExt) || outbound.includes(linkWoExt)) {
        sourceFiles.push(file)
      }
    }

    return sourceFiles
  }

  /**
   * Retrieves a set of files the given source file links to
   *
   * @param   {string}    sourceFilePath  The source file's path
   *
   * @return  {string[]}                  A list of outbound links from source
   */
  retrieveOutbound (sourceFilePath: string): string[] {
    const dbLinks = this._fileLinkDatabase.get(sourceFilePath)
    if (dbLinks === undefined) {
      return []
    }

    const outboundLinks: string[] = []

    for (const link of dbLinks) {
      // TODO: findExact must move into the workspaces from the FSAL
      const descriptor = this._workspaces.findExact(link)
      if (descriptor !== undefined) {
        outboundLinks.push(descriptor.path)
      }
    }

    return outboundLinks
  }

  /**
   * Retrieves a set of files which contain the link
   *
   * @param link The link to look for
   * @returns A list of files
   */
  retrieveFilesWithLink (link: string): string[] {
    const sourceFiles: string[] = []

    // Search all recorded links
    for (const [ file, outbound ] of this._fileLinkDatabase.entries()) {
      if (outbound.includes(link)) {
        sourceFiles.push(file)
      }
    }

    return sourceFiles
  }

  /**
   * For the given file retrieves the set of links that don't point
   * to any file.
   * @param sourceFilePath
   * @returns A list of links
   */
  retrieveNonFileLinks (sourceFilePath: string): string[] {
    const dbLinks = this._fileLinkDatabase.get(sourceFilePath)
    if (dbLinks === undefined) {
      return []
    }

    const nonFileLinks: string[] = []

    for (const link of dbLinks) {
      const descriptor = this._fsal.findExact(link)
      if (descriptor === undefined) {
        // For some reason the database doesn't remove duplicates, so we do it manually here
        if (!nonFileLinks.includes(link)) {
          nonFileLinks.push(link)
        }
      }
    }

    return nonFileLinks
  }

  /**
   * For the given file retrieves _all_ unique outbound links.
   * This includes both links pointing to actual files as well as
   * non-file links.
   * @param sourceFilePath The file
   */
  retrieveAllOutboundLinks (sourceFilePath: string): string[] {
    const dbLinks = this._fileLinkDatabase.get(sourceFilePath)
    if (dbLinks === undefined) {
      return []
    }

    const links: string[] = []

    for (const link of dbLinks) {
      // For some reason the database doesn't remove duplicates, so we do it manually here
      if (!links.includes(link)) {
        // Do not include links to the file itself
        if (link === path.basename(sourceFilePath, '.md') || link === path.basename(sourceFilePath)) continue

        links.push(link)
      }
    }
    return links
  }
}
