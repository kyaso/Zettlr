/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        SearchIndexProvider class
 * CVM-Role:        Service Provider
 * Maintainer:      Kirthihan Yasotharan
 * License:         GNU GPL v3
 *
 * Description:     Implements a full-text search index.
 *
 * END HEADER
 */

import ProviderContract from '@providers/provider-contract'
import { create, insert, search, getByID, update, count } from '@orama/orama'
import type LogProvider from '@providers/log'

export default class SearchIndexProvider extends ProviderContract {
  private _db: any

  constructor (
    private readonly _logger: LogProvider
  ) {
    super()
  }

  public async boot (): Promise<void> {
    this._logger.verbose('SearchIndex booting up ...')
    await this.init()
  }

  private async init (): Promise<any> {
    this._db = await create({
      schema: {
        id: 'string',
        fileName: 'string',
        fileContent: 'string'
      }
    })
  }

  public async insert (id: string, fileName: string, fileContent: string): Promise<any> {
    this._logger.verbose(`SearchIndexProvider: Inserting ${id}...`)
    await insert(this._db, {
      id,
      fileName,
      fileContent
    })
  }

  public async update (id: string, fileName: string, fileContent: string): Promise<any> {
    this._logger.verbose(`SearchIndexProvider: Updating ${id}...`)
    await update(this._db, id, {
      id,
      fileName,
      fileContent
    })
  }

  public async search (query: string): Promise<any> {
    this._logger.verbose(`SearchIndexProvider: Searching for ${query}...`)
    const result = await search(this._db, {
      term: query,
      properties: [ 'fileName', 'fileContent' ],
      // By default, orama only returns 10 results, hence we increase the limit
      // to the number of indexed files
      limit: await count(this._db)
    })
    // console.log(`Search took ${result.elapsed.formatted}`)
    // console.log(`Search result: ${JSON.stringify(result, undefined, 2)}`)
    // console.log(`count = ${result.count}`)
    const fileList: string[] = result.hits.map(hit => hit.document.fileName)
    // console.log(`File list: ${fileList} (${fileList.length})`)
    return fileList
  }

  public async contains (id: string): Promise<boolean> {
    const ret = await getByID(this._db, id)
    return (ret !== undefined)
  }

  public async shutdown (): Promise<void> {
    this._logger.verbose('SearchIndex shutting down ...')
  }
}
