/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        UpdateMentionsAction
 * CVM-Role:        Controller
 * Maintainer:      Kirthihan Yasotharan
 * License:         GNU GPL v3
 *
 * Description:     Updates the lists of backlinks and unlinked mentions
 *
 * END HEADER
 */

import compileSearchTerms from '@common/util/compile-search-terms'
import objectToArray from '@common/util/object-to-array'
import { OpenDocument } from '@dts/common/documents'
import {
  SearchResult,
  SearchResultWrapper,
  SearchTerm
} from '@dts/common/search'
import { hasMarkdownExt } from '@providers/fsal/util/is-md-or-code-file'
import { ActionContext } from 'vuex'
import { ZettlrState } from '..'

const path = window.path
const ipcRenderer = window.ipc

let maxWeight = 0

export default async function (
  context: ActionContext<ZettlrState, ZettlrState>
): Promise<void> {
  const activeFile: OpenDocument | null = context.getters.lastLeafActiveFile()
  if (activeFile === null || !hasMarkdownExt(activeFile.path)) {
    context.commit('clearMentions')
    return
  }

  console.warn('updateMentionsAction')
  // context.commit('clearMentions')

  let unlinkedMentions: SearchResultWrapper[] = []
  let backlinks: SearchResultWrapper[] = []

  // Get file name
  const fileNameMd = path.basename(activeFile.path)
  const activeFileName = fileNameMd.slice(0, -3)
  const fileNameLink = '[[' + activeFileName + ']]'
  const fileNameExact = '"' + activeFileName + '"'

  // First, get all mentions
  // Note, we store it into unlinkedMentions, but later we extract
  // all the backlinks out of that array.
  unlinkedMentions = await search(context, fileNameExact)

  // Separate backlinks from rest
  let skipMe = false
  for (let i = unlinkedMentions.length - 1; i >= 0; i--) {
    maxWeight = 0

    // Current result set
    const x = unlinkedMentions[i]

    // Remove if the result set is from the current file itself
    if (!skipMe && x.file.filename === fileNameMd) {
      unlinkedMentions.splice(i, 1)

      // This is an optimization since this if statement can only evaluate
      // to true at most once.
      skipMe = true
      continue
    }

    let tmpBacklinks: any[] = []

    // Iterate over the lines of the current result set
    for (let j = x.result.length - 1; j >= 0; j--) {
      const isBacklink: boolean = x.result[j].restext.includes(fileNameLink)
      const isNegOne: boolean = x.result[j].line === -1

      if (isBacklink || isNegOne) {
        if (isBacklink) {
          // unshift because we are iterating backwards
          // So we have to push it to the front
          tmpBacklinks.unshift(x.result[j])
        }

        // Remove the result line
        x.result.splice(j, 1)

        // If there are no more result lines left, we can
        // remove the entire result set
        if (x.result.length === 0) {
          unlinkedMentions.splice(i, 1)
          break
        }
      }
    }

    // There were backlinks in the current result set
    if (tmpBacklinks.length > 0) {
      const newResult: SearchResultWrapper = {
        file: x.file,
        result: tmpBacklinks,
        hideResultSet: false,
        weight: tmpBacklinks.reduce(
          (accumulator: number, currentValue: SearchResult) => {
            return accumulator + currentValue.weight
          },
          0
        )
      }

      backlinks.unshift(newResult)

      if (newResult.weight > maxWeight) {
        maxWeight = newResult.weight
      }

      // sort
      backlinks.sort((a, b) => b.weight - a.weight)
    }
  }

  // Commit to store
  context.commit('updateBacklinks', backlinks)
  context.commit('updateUnlinkedMentions', unlinkedMentions)
}

// **** Adapted from GlobalSearch.vue::startSearch() ****
async function search (
  context: ActionContext<ZettlrState, ZettlrState>,
  query: string
): Promise<SearchResultWrapper[]> {
  let filesToSearch: any[] = []
  const results: SearchResultWrapper[] = []

  const useH1: boolean =
    context.state.config.fileNameDisplay.includes('heading')
  const useTitle: boolean =
    context.state.config.fileNameDisplay.includes('title')

  // Get files we need to search
  for (const treeItem of context.state.fileTree) {
    if (treeItem.type !== 'directory') {
      let displayName = treeItem.name
      if (treeItem.type === 'file') {
        if (useTitle && typeof treeItem.frontmatter?.title === 'string') {
          displayName = treeItem.frontmatter.title
        } else if (useH1 && treeItem.firstHeading !== null) {
          displayName = treeItem.firstHeading
        }
      }
      filesToSearch.push({
        path: treeItem.path,
        relativeDirectoryPath: '',
        filename: treeItem.name,
        displayName
      })
      continue
    }
    let dirContents = objectToArray(treeItem, 'children')
    dirContents = dirContents.filter((item) => item.type !== 'directory')
    dirContents = dirContents.map((item) => {
      let displayName = item.name
      if (
        useTitle &&
        item.frontmatter != null &&
        typeof item.frontmatter.title === 'string'
      ) {
        displayName = item.frontmatter.title
      } else if (useH1 && item.firstHeading !== null) {
        displayName = item.firstHeading
      }
      return {
        path: item.path,
        // Remove the workspace directory path itself so only the
        // app-internal relative path remains. Also, we're removing the leading (back)slash
        relativeDirectoryPath: item.dir.replace(treeItem.dir, '').substr(1),
        filename: item.name,
        displayName
      }
    })
    filesToSearch = filesToSearch.concat(dirContents)
  }

  // We have to compile because the 'file-search' command only accepts those
  const terms: SearchTerm[] = compileSearchTerms(query)

  // Query index
  const queryResult: [] = await ipcRenderer.invoke('application', {
    command: 'query-index',
    payload: {
      query
    }
  })

  // **** The part below was taken and adapted from GlobalSearch.vue::singleSearchRun() ****

  // Filter filesToSearch
  filesToSearch = filesToSearch.filter((f) => queryResult.includes(f.path))
  // console.log('filesToSearch after query filter: ', filesToSearch)

  // For each file to search, run the 'file-search' command
  while (filesToSearch.length > 0) {
    const fileToSearch = filesToSearch.shift() as any

    // Do search
    const result: SearchResult[] = await ipcRenderer.invoke('application', {
      command: 'file-search',
      payload: {
        path: fileToSearch.path,
        terms
      }
    })

    if (result.length > 0) {
      const newResult: SearchResultWrapper = {
        file: fileToSearch,
        result,
        hideResultSet: false, // If true, the individual results won't be displayed
        weight: result.reduce(
          (accumulator: number, currentValue: SearchResult) => {
            return accumulator + currentValue.weight
          },
          0 // This is the initialValue, b/c we're summing up props
        )
      }
      results.push(newResult)

      if (newResult.weight > maxWeight) {
        maxWeight = newResult.weight
      }

      // sort
      results.sort((a, b) => b.weight - a.weight)
    }
  }
  return results
}
