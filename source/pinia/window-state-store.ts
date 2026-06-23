/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        useWindowState
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This model manages the state for any given main window, i.e.
 *                  values that represent volatile configuration of the window
 *                  UI or UX without affecting other state managers.
 *
 * END HEADER
 */

import { defineStore } from 'pinia'
import type { DocumentInfo } from 'source/common/modules/markdown-editor'
import type { ToCEntry } from 'source/common/modules/markdown-editor/plugins/toc-field'
import { computed, ref, type Ref } from 'vue'
import { type WritingTarget } from '@providers/targets'
import type { AssetsProviderIPCAPI } from 'source/app/service-providers/assets'
import type { SearchResultWrapper } from 'source/win-main/GlobalSearch.vue'

const ipcRenderer = window.ipc

async function updateSnippets (snippets: Ref<Array<{ name: string, content: string }>>): Promise<void> {
  // Now we have to pair two types of calls to the assets provider to get all
  // snippets: First a call to list all snippets, and then one `get` call to
  // retrieve its file contents.
  const snippetNames: string[] = await ipcRenderer.invoke('assets-provider', {
    command: 'list-snippets'
  } as AssetsProviderIPCAPI)

  const newSnippets: Array<{ name: string, content: string }> = []
  for (const snippet of snippetNames) {
    const content: string = await ipcRenderer.invoke('assets-provider', {
      command: 'get-snippet',
      payload: { name: snippet }
    } as AssetsProviderIPCAPI)

    newSnippets.push({ name: snippet, content })
  }

  snippets.value = newSnippets
}

export const useWindowStateStore = defineStore('window-state', () => {
  const isFullscreen = ref(false)
  const uncollapsedDirectories = ref<string[]>([])
  const distractionFreeMode = ref<undefined|string>(undefined)
  const activeDocumentInfo = ref<undefined|DocumentInfo>(undefined)
  const tableOfContents = ref<ToCEntry[]|undefined>(undefined)
  const snippets = ref<Array<{ name: string, content: string }>>([])
  const writingTargets = ref<WritingTarget[]>([])

  /**
   * SEARCH RESULTS FUNCTIONALITY
   */
  const searchResults = ref<SearchResultWrapper[]>([])
  const maxSearchResultWeight = computed(() => {
    // NOTE: Use a reduce instead of `Math.max(...weights)` since the spread can
    // overflow the call stack for large result sets and allocates a temporary
    // array on every recomputation.
    return searchResults.value.reduce((max, r) => Math.max(max, r.weight), 0)
  })

  function addSearchResult (result: SearchResultWrapper) {
    // Insert the result at its correct position (descending by weight) using a
    // binary search. This keeps the list sorted as results stream in without
    // re-sorting the entire array on every single result, which would be
    // O(n² log n) over the course of a search.
    const results = searchResults.value
    let low = 0
    let high = results.length
    while (low < high) {
      const mid = (low + high) >>> 1
      if (results[mid].weight > result.weight) {
        low = mid + 1
      } else {
        high = mid
      }
    }
    results.splice(low, 0, result)
  }

  /**
   * Adds a whole batch of search results at once, triggering only a single
   * reactive update (and thus a single re-render) for the entire batch. This is
   * far cheaper than calling addSearchResult in a tight loop when many results
   * stream in at the same time.
   *
   * @param  {SearchResultWrapper[]}  results  The results to add
   */
  function addSearchResults (results: SearchResultWrapper[]) {
    if (results.length === 0) {
      return
    }
    // Append all at once and sort the combined array a single time.
    const combined = searchResults.value.concat(results)
    combined.sort((a, b) => b.weight - a.weight)
    searchResults.value = combined
  }

  // Snippets
  ipcRenderer.on('assets-provider', (event, what: string) => {
    if (what === 'snippets-updated') {
      updateSnippets(snippets).catch(e => console.error(e))
    }
  })

  updateSnippets(snippets).catch(e => console.error(e))

  // Writing targets
  ipcRenderer.on('targets-provider', (event, what: string) => {
    if (what === 'writing-targets-updated') {
      ipcRenderer.invoke('targets-provider', { command: 'get-targets' })
        .then((targets: WritingTarget[]) => { writingTargets.value = targets })
        .catch(e => console.error(e))
    }
  })

  ipcRenderer.invoke('targets-provider', { command: 'get-targets' })
    .then((targets: WritingTarget[]) => { writingTargets.value = targets })
    .catch(e => console.error(e))
  
  ipcRenderer.on('window-controls', (event, { command, payload }) => {
    if (command === 'fullscreen' && typeof payload === 'boolean') {
      isFullscreen.value = payload
    }
  })

  return {
    uncollapsedDirectories,
    distractionFreeMode,
    activeDocumentInfo,
    tableOfContents,
    searchResults,
    addSearchResult,
    addSearchResults,
    maxSearchResultWeight,
    snippets,
    writingTargets,
    isFullscreen
  }
})
