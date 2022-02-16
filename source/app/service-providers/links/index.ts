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
import AppServiceContainer from 'source/app/app-service-container'

/**
 * This class manages the coloured tags of the app. It reads the tags on each
 * start of the app and writes them after they have been changed.
 */
export default class LinkProvider extends ProviderContract {
  private readonly _fileLinkDatabase: Map<string, string[]>
  private readonly _idLinkDatabase: Map<string, string[]>

  /**
   * Create the instance on program start and initially load the tags.
   */
  constructor (private readonly _app: AppServiceContainer) {
    super()

    this._fileLinkDatabase = new Map()
    this._idLinkDatabase = new Map()
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
      }
    })
  }

  /**
   * Shuts down the service provider
   * @return {Boolean} Returns true after successful shutdown
   */
  async shutdown (): Promise<void> {
    this._app.log.verbose('Link provider shutting down ...')
  }

  /**
   * Adds an array of links from a specific file to the database. This
   * function assumes sourceIDs to be unique, so in case of a duplicate, the
   * later-loaded file overrides the earlier loaded one.
   *
   * @param   {string}            sourcePath     The full path to the source file
   * @param   {string[]}          outboundLinks  A collection of links
   * @param   {string|undefined}  sourceID       The ID of the source (if applicable)
   */
  report (sourcePath: string, outboundLinks: string[], sourceID?: string): void {
    // NOTE: The FSAL by now defaults to an empty string instead of undefined
    if (sourceID === '') {
      sourceID = undefined
    }

    // NOTE: To anyone who comes here thinking that one might be able to
    // optimize the graph building below further by resolving links immediately
    // when they arrive here: That won't work because most of the time the
    // target files won't be loaded when the source file's links arrive here.

    this._fileLinkDatabase.set(sourcePath, outboundLinks)
    if (sourceID !== undefined) {
      this._idLinkDatabase.set(sourceID, outboundLinks)
    }
    broadcastIpcMessage('links')
  }

  /**
   * Removes any outbound links emanating from the given file from the
   * database. This function assumes sourceIDs to be unique, so in case of
   * a duplicate, removing any of these files will delete the links for all.
   *
   * @param   {string}            sourcePath     The full path to the source file
   * @param   {string|undefined}  sourceID       The ID of the source (if applicable)
   */
  remove (sourcePath: string, sourceID?: string): void {
    // NOTE: The FSAL by now defaults to an empty string instead of undefined
    if (sourceID === '') {
      sourceID = undefined
    }

    if (this._fileLinkDatabase.has(sourcePath)) {
      this._fileLinkDatabase.delete(sourcePath)
    }

    if (sourceID !== undefined && this._idLinkDatabase.has(sourceID)) {
      this._idLinkDatabase.delete(sourceID)
    }
    broadcastIpcMessage('links')
  }

  /**
   * Retrieves a set of links to the file given as argument
   *
   * @param   {string}    sourceFilePath  The source file's path
   *
   * @return  {string[]}                  A list of all files linking to sourceFile
   */
  retrieveInbound (sourceFilePath: string): string[] {
    const sourceFiles: string[] = []

    // Search all recorded links
    for (const [ file, outbound ] of this._fileLinkDatabase.entries()) {
      if (outbound.includes(sourceFilePath)) {
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
    return this._fileLinkDatabase.get(sourceFilePath) ?? []
  }
}
