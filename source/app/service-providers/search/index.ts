/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        SearchProvider
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file defines a search provider that allows finding
 *                  things across the loaded workspaces.
 *
 * END HEADER
 */

import type LogProvider from '../log'
import type ProviderContract from '../provider-contract'
import { ipcMain } from 'electron'
import type { IPCAPI } from '../provider-contract'
import { compileBooleanQuery, searchFileBoolean, type SearchResult, type SearchQueryBoolean } from './util/boolean-search'
import type FSAL from '../fsal'
import broadcastIPCMessage from 'source/common/util/broadcast-ipc-message'
import type ConfigProvider from '../config'
import type SearchIndexProvider from '../search-index'

export { SearchResult, FileContentSearchResult } from './util/boolean-search'

export type SearchProviderIPCAPI = IPCAPI<{
  'start-full-text-search': { query: string, restrictToDirectory: string, caseInsensitive: boolean },
  'cancel-search': unknown
}>

export class SearchProvider implements ProviderContract {
  /**
   * The default maximum number of files to search in parallel, used when the
   * configured value (custom.maxConcurrentSearches) is missing or invalid.
   *
   * @var {number}
   */
  private static readonly DEFAULT_MAX_CONCURRENT_SEARCHES = 8
  /**
   * Keeps a count of all files that will be searched during a search-in-
   * progress. Used to calculate an overall progress.
   *
   * @var {number}
   */
  private sumFilesToSearch: number
  /**
   * The number of files that have been searched so far during the ongoing
   * search. Used to compute the overall progress.
   *
   * @var {number}
   */
  private searchedFiles: number
  /**
   * The timestamp (ms) at which the current search started. Used for logging
   * the total search duration.
   *
   * @var {number}
   */
  private searchStartTime: number
  /**
   * Contains the absolute paths of all files that will be searched during the
   * ongoing search.
   *
   * @var {string[]}
   */
  private fileSearchQueue: string[]
  /**
   * Contains the current search query.
   *
   * @var {SearchQueryBoolean|undefined}
   */
  private currentQuery: SearchQueryBoolean|undefined

  constructor (private readonly _logger: LogProvider, private readonly _fsal: FSAL, private readonly _config: ConfigProvider, private readonly _index: SearchIndexProvider) {
    this.currentQuery = undefined
    this.fileSearchQueue = []
    this.sumFilesToSearch = 0
    this.searchedFiles = 0
    this.searchStartTime = 0

    ipcMain.handle('search-provider', async (event, message: SearchProviderIPCAPI) => {
      const { command, payload } = message

      if (command === 'start-full-text-search') {
        return await this.startFullTextSearch(
          payload.query, payload.restrictToDirectory, payload.caseInsensitive
        )
      } else if (command === 'cancel-search') {
        // By simply removing all remaining files, we can let the search agent
        // finish its current search and then just stop (& emit the correct
        // events).
        this.currentQuery = undefined
        this.fileSearchQueue = []
        this.sumFilesToSearch = 0
      }
    })
  }

  async boot () {}

  async shutdown () {}

  /**
   * Begins a new full-text search
   *
   * @param   {string}   query                The query to search for
   * @param   {string}   restrictToDirectory  If provided, restricts the search to the provided directory
   * @param   {boolean}  caseInsensitive      Whether to perform a case insensitive search
   * @param   {string}   type                 The type of search. Currently unused.
   *
   * @return  {number}                        The number of files that will be searched.
   */
  private async startFullTextSearch (query: string, restrictToDirectory: string, caseInsensitive: boolean, type: 'boolean' = 'boolean'): Promise<number> {
    if (type !== 'boolean') {
      throw new Error(`Cannot start search: Type ${type} unrecognized.`)
    }

    this.currentQuery = compileBooleanQuery(query, caseInsensitive)
    if (restrictToDirectory.trim() === '') {
      // The user wants to search all workspaces and files
      const { openWorkspaces, openFiles } = this._config.get().app

      // First, await all paths within all our workspaces to generate a list of
      // files recursively.
      const promises = openWorkspaces.map(ws => this._fsal.readDirectoryRecursively(ws))
      const workspacePaths = (await Promise.all(promises)).flat()

      // Then, use that list plus all open files to create a file search queue.
      const allPaths = workspacePaths.concat(openFiles)

      for (const p of allPaths) {
        if (await this._fsal.isFile(p)) {
          this.fileSearchQueue.push(p)
        }
      }
    } else {
      // The user only wants to search a single directory.
      this.fileSearchQueue = await this._fsal.readDirectoryRecursively(restrictToDirectory)
    }

    // Only consider markdown files
    this.fileSearchQueue = this.fileSearchQueue.filter(p => p.endsWith('.md'))

    this._logger.verbose(`[Search Provider] fileSearchQueue length: ${this.fileSearchQueue.length}`)

    const indexResults = this._index.search(query)
    if (indexResults.length > 0) {
      this._logger.verbose(`[Search Provider] Search index returned ${indexResults.length} results. Prioritizing these files in the search...`)
      // Move all index results to the front of the search queue
      const diff = this.fileSearchQueue.filter(p => !indexResults.includes(p))
      this.fileSearchQueue = indexResults.concat(diff)
    }

    this.sumFilesToSearch = this.fileSearchQueue.length
    this.searchedFiles = 0
    this._logger.verbose(`[Search Provider] ${this.sumFilesToSearch} files will be searched.`)

    // Start the search using a pool of concurrent workers so that the disk I/O
    // of loading and parsing files does not get serialized on the main process.
    // NOTE: We deliberately do not await this so that the IPC call returns the
    // file count immediately; progress is reported via broadcast events.
    this.runSearchWorkers().catch(err => {
      this._logger.error(`[Search Provider] Search failed: ${err}`, err)
    })

    // Return the number of files to search
    return this.fileSearchQueue.length
  }

  /**
   * Spins up a pool of concurrent search workers, each of which pulls files
   * from the queue until it is empty, and resolves once every worker is done.
   */
  private async runSearchWorkers (): Promise<void> {
    const concurrency = Math.min(this.getMaxConcurrentSearches(), this.fileSearchQueue.length)

    if (concurrency === 0 || this.currentQuery === undefined) {
      broadcastIPCMessage('search-provider', { type: 'search-end' })
      this.currentQuery = undefined
      return
    }

    this._logger.verbose(`[Search Provider] Starting ${concurrency} search worker(s) for ${this.fileSearchQueue.length} files.`)
    this.searchStartTime = Date.now()

    // Launch all workers and wait for every one of them to drain the queue.
    await Promise.all(
      Array.from({ length: concurrency }, (_, i) => this.searchWorker(i))
    )

    const elapsed = Date.now() - this.searchStartTime
    this._logger.verbose(`[Search Provider] Search complete: ${this.searchedFiles}/${this.sumFilesToSearch} files searched in ${elapsed}ms.`)
    broadcastIPCMessage('search-provider', { type: 'search-end' })
    this.currentQuery = undefined
  }

  /**
   * Returns the configured maximum number of files to search in parallel,
   * falling back to the default if the configured value is missing or invalid.
   *
   * @return  {number}  A positive integer concurrency limit.
   */
  private getMaxConcurrentSearches (): number {
    const configured = this._config.get().custom.maxConcurrentSearches
    if (typeof configured === 'number' && Number.isInteger(configured) && configured > 0) {
      return configured
    }
    return SearchProvider.DEFAULT_MAX_CONCURRENT_SEARCHES
  }

  /**
   * A single search worker: keeps pulling files off the shared queue and
   * searching them until the queue is empty (or the search was cancelled).
   *
   * @param  {number}  workerId  An identifier for this worker, used for logging.
   */
  private async searchWorker (workerId: number): Promise<void> {
    let nextFile: string | undefined
    while ((nextFile = this.fileSearchQueue.shift()) !== undefined && this.currentQuery !== undefined) {
      // const fileStartTime = Date.now()
      // this._logger.verbose(`[Search Provider] Worker #${workerId} searching ${nextFile} (${this.fileSearchQueue.length} file(s) left in queue).`)
      try {
        const rawResult = await this.searchFileBoolean(nextFile, this.currentQuery)
        // Save some resources both in the IPC and the renderer by not
        // reporting empty results. We do so by setting the result as undefined.
        const result = rawResult.length > 0 ? rawResult : undefined
        this.searchedFiles++
        const progress = this.searchedFiles / this.sumFilesToSearch
        // const elapsed = Date.now() - fileStartTime
        // this._logger.verbose(`[Search Provider] Worker #${workerId} done with ${nextFile} in ${elapsed}ms (${rawResult.length} match(es), progress ${Math.round(progress * 100)}%).`)
        broadcastIPCMessage('search-provider', { type: 'search-result', file: nextFile, result, progress })
      } catch (err) {
        this.searchedFiles++
        this._logger.error(`[Search Provider] Worker #${workerId} could not search file ${nextFile}: ${err}`, err)
      }
    }

    // this._logger.verbose(`[Search Provider] Worker #${workerId} finished.`)
  }

  /**
   * Searches a file using a boolean search query
   *
   * @param   {string}              absPath  The file path
   * @param   {SearchQueryBoolean}  query    The query
   *
   * @return  {SearchResult}                 The search result
   */
  private async searchFileBoolean (absPath: string, query: SearchQueryBoolean): Promise<SearchResult> {
    const descriptor = await this._fsal.getDescriptorForAnySupportedFile(absPath)
    if (descriptor.type === 'other') {
      return []
    }

    const fileContent = await this._fsal.loadAnySupportedFile(absPath)
    return searchFileBoolean(descriptor, fileContent, query)
  }
}
