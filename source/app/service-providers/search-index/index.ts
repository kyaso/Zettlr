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
  private startTime: number

  constructor (
    private readonly _logger: LogProvider
  ) {
    super()
  }

  public async boot (): Promise<void> {
    this._logger.verbose('SearchIndex booting up ...')
    this.init()
  }

  private init () {
    return
    this._db = create({
      schema: {
        id: 'string',
        filePath: 'string',
        fileContent: 'string'
      }
    })
  }

  private startTimeMeasurement () {
    this.startTime = performance.now()
  }

  private endTimeMeasurement (what: string) {
    const endTime = performance.now()
    const executionTime = endTime - this.startTime
    this._logger.verbose(`SearchIndexProvider: ${what} took: ${executionTime}ms`)
  }

  public insert (id: string, filePath: string, fileContent: string) {
    return
    this._logger.verbose(`SearchIndexProvider: Inserting ${id}...`)
    this.startTimeMeasurement()
    void insert(this._db, {
      id,
      filePath,
      fileContent
    })
    this.endTimeMeasurement('Insert')
  }

  public update (id: string, filePath: string, fileContent: string) {
    return
    this._logger.verbose(`SearchIndexProvider: Updating ${id}...`)
    this.startTimeMeasurement()
    void update(this._db, id, {
      id,
      filePath,
      fileContent
    })
    this.endTimeMeasurement('Update')
  }

  public search (query: string) {
    return []
    this._logger.verbose(`SearchIndexProvider: Searching for ${query}...`)
    this.startTimeMeasurement()
    this._logger.verbose(`Number of indexed documents: ${count(this._db)}`)
    const result: any = search(this._db, {
      term: query,
      properties: [ 'filePath', 'fileContent' ],
      // By default, orama only returns 10 results, hence we increase the limit
      // to the number of indexed files
      limit: count(this._db)
    })
    this._logger.verbose(`SearchIndexProvider: Orama search took ${result.elapsed.formatted}.`)
    // console.log(`Search took ${result.elapsed.formatted}`)
    // console.log(`Search result: ${JSON.stringify(result, undefined, 2)}`)
    // console.log(`count = ${result.count}`)
    const fileList: string[] = result.hits.map((hit: any) => hit.document.filePath)
    // console.log(`File list: ${fileList} (${fileList.length})`)
    this.endTimeMeasurement('Search')
    return fileList
  }

  public contains (id: string) {
    return true
    const ret = getByID(this._db, id)
    return (ret !== undefined)
  }

  public async shutdown (): Promise<void> {
    this._logger.verbose('SearchIndex shutting down ...')
  }
}
