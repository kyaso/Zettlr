<template>
  <div role="tabpanel">
    <div v-bind:class="{ 'remove-border-top': notInToc }" class="header-toggle" v-on:click="hideBacklinks = !hideBacklinks">
      <cds-icon
        shape="angle" v-bind:direction="(hideBacklinks) ? 'right' : 'down'"
      ></cds-icon>
      <h1 class="backlinks-title">
        {{ backlinksTitle }}
      </h1>
    </div>

    <div v-if="!hideBacklinks">
      <ButtonControl
        class="mentions-toggle"
        v-bind:label="'Toggle'"
        v-bind:inline="true"
        v-on:click="toggleResults('backlinks')"
      ></ButtonControl>

      <!-- Copied and adapted from GlobalSearch.vue -->
      <div
        v-for="(result, idx) in backlinks"
        v-bind:key="idx"
        class="backlinks-container"
      >
        <div
          class="filename"
          v-on:click="result.hideResultSet = !result.hideResultSet"
        >
          <!--
              NOTE: This DIV is just here due to the parent item's "display: flex",
              such that the filename plus indicator icon are floated to the left,
              while the collapse icon is floated to the right.
            -->
          <div class="overflow-hidden">
            <cds-icon
              v-if="result.weight / maxWeight < 0.3"
              shape="dot-circle"
              style="fill: #aaaaaa"
            ></cds-icon>
            <cds-icon
              v-else-if="result.weight / maxWeight < 0.7"
              shape="dot-circle"
              style="fill: #2975d9"
            ></cds-icon>
            <cds-icon
              v-else
              shape="dot-circle"
              style="fill: #33aa33"
            ></cds-icon>
            {{ result.file.displayName }}
          </div>

          <div class="controls collapse-icon">
            <cds-icon
              shape="angle" v-bind:direction="(result.hideResultSet) ? 'left' : 'down'"
            ></cds-icon>
          </div>
        </div>
        <div class="filepath">
          {{ result.file.relativeDirectoryPath
          }}{{ result.file.relativeDirectoryPath !== '' ? '/' : ''
          }}{{ result.file.filename }}
        </div>
        <div v-if="!result.hideResultSet" class="results-container">
          <div
            v-for="(singleRes, idx2) in result.result"
            v-bind:key="idx2"
            class="result-line"
            v-on:mousedown.stop.prevent="
              onResultClick($event, result.file.path, singleRes.line)
            "
          >
            <span v-if="singleRes.line !== -1">
              <strong>{{ singleRes.line }}</strong>:
            </span>
            <span v-html="markText(singleRes)"></span>
          </div>
        </div>
      </div>
      <!-- v-for -->
    </div>
    <!-- hideBacklinks -->

    <div class="header-toggle" v-on:click="hideUnlinkedMentions = !hideUnlinkedMentions">
      <cds-icon
        shape="angle" v-bind:direction="(hideUnlinkedMentions) ? 'right' : 'down'"
      ></cds-icon>
      <h1 class="backlinks-title">
        {{ unlinkedMentionsTitle }}
      </h1>
    </div>

    <div v-if="!hideUnlinkedMentions">
      <ButtonControl
        class="mentions-toggle"
        v-bind:label="'Toggle'"
        v-bind:inline="true"
        v-on:click="toggleResults('unlinked')"
      ></ButtonControl>

      <!-- Copied and adapted from GlobalSearch.vue -->
      <div
        v-for="(result, idx) in unlinkedMentions"
        v-bind:key="idx"
        class="backlinks-container"
      >
        <div
          class="filename"
          v-on:click="result.hideResultSet = !result.hideResultSet"
        >
          <!--
              NOTE: This DIV is just here due to the parent item's "display: flex",
              such that the filename plus indicator icon are floated to the left,
              while the collapse icon is floated to the right.
            -->
          <div class="overflow-hidden">
            <cds-icon
              v-if="result.weight / maxWeight < 0.3"
              shape="dot-circle"
              style="fill: #aaaaaa"
            ></cds-icon>
            <cds-icon
              v-else-if="result.weight / maxWeight < 0.7"
              shape="dot-circle"
              style="fill: #2975d9"
            ></cds-icon>
            <cds-icon
              v-else
              shape="dot-circle"
              style="fill: #33aa33"
            ></cds-icon>
            {{ result.file.displayName }}
          </div>

          <div class="controls collapse-icon">
            <cds-icon
              shape="angle" v-bind:direction="(result.hideResultSet) ? 'left' : 'down'"
            ></cds-icon>
          </div>
        </div>
        <div class="filepath">
          {{ result.file.relativeDirectoryPath
          }}{{ result.file.relativeDirectoryPath !== '' ? '/' : ''
          }}{{ result.file.filename }}
        </div>
        <div v-if="!result.hideResultSet" class="results-container">
          <div
            v-for="(singleRes, idx2) in result.result"
            v-bind:key="idx2"
            class="result-line"
            v-on:mousedown.stop.prevent="
              onResultClick($event, result.file.path, singleRes.line)
            "
          >
            <span v-if="singleRes.line !== -1">
              <strong>{{ singleRes.line }}</strong>:
            </span>
            <span v-html="markText(singleRes)"></span>
          </div>
        </div>
      </div>
      <!-- v-for -->
    </div>
    <!-- hideUnlinkedMentions -->

    <!-- Outbound links -->
    <div class="header-toggle" v-on:click="hideOutboundLinks = !hideOutboundLinks">
      <cds-icon
        shape="angle" v-bind:direction="(hideOutboundLinks) ? 'right' : 'down'"
      ></cds-icon>
      <h1 class="backlinks-title">
        {{ outboundLinksTitle }}
      </h1>
    </div>
    <div v-if="!hideOutboundLinks">
      <ButtonControl
        class="mentions-toggle"
        v-bind:label="'Toggle'"
        v-bind:inline="true"
        v-on:click="toggleResults('outbound')"
      ></ButtonControl>
      <div
        v-for="link in outboundLinks"
        v-bind:key="link"
        class="backlinks-container"
      >
        <div
          class="filename"
          v-on:click="link.hideFileSet = !link.hideFileSet"
        >
          <div
            v-bind:class="{ 'highlight-outbound': recentSearchQueryMatches(link.link) }"
            class="overflow-hidden"
            v-bind:title="link.link"
          >
            {{ getLinkStr(link) }}
          </div>
          <div class="buttons">
            <div
              v-if="hasBacklink(link)"
            >
              <cds-icon
                class="backlink-arrow-icon"
                shape="arrow"
                direction="left"
                title="This note links back to the active file"
              ></cds-icon>
            </div>
            <div
              v-if="linkIsFile(link)"
              class="controls file-icon"
              v-on:click.stop="requestFile($event, link.targetFilePath)"
            >
              <cds-icon
                shape="file"
                title="Open note"
              ></cds-icon>
            </div>
            <div
              class="controls search-icon"
              v-on:click.stop="onSearchClick(link)"
            >
              <cds-icon
                shape="search"
                title="Search"
              ></cds-icon>
            </div>
            <div
              v-if="link.files.length !== 0"
              class="controls collapse-icon"
            >
              <cds-icon
                shape="angle" v-bind:direction="(link.hideFileSet) ? 'left' : 'down'"
              ></cds-icon>
            </div>
          </div>
        </div>
        <div
          v-if="!link.hideFileSet"
          class="results-container"
        >
          <div
            v-for="file in link.files"
            v-bind:key="file"
            class="result-line"
            v-on:click.stop="requestFile($event, file)"
          >
            {{ getFileName(file) }}
          </div> <!-- v-for link.files -->
        </div>
      </div> <!-- v-for outboundLink -->
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Backlinks Sidebar Tab
 * CVM-Role:        View
 * Maintainer:      Kirthihan Yasotharan
 * License:         GNU GPL v3
 *
 * Description:     This implements the backlinks/unlinked mentions sidebar tab.
 *                  A lot of the functionality has been recycled from
 *                  GlobalSearch.vue.
 *
 * END HEADER
 */

import ButtonControl from '@common/vue/form/elements/ButtonControl.vue'
import { type SearchResult, type SearchResultWrapper, type SearchTerm } from '@dts/common/search'
// import { defineComponent } from '@vue/runtime-core'
import { markText as markTextShared } from '../shared'
import { copyZknLink } from '@common/util/clipboard'
import { DP_EVENTS, OpenDocument } from '@dts/common/documents'
import objectToArray from '@common/util/object-to-array'
import compileSearchTerms from '@common/util/compile-search-terms'
import { type MDFileDescriptor } from '@dts/common/fsal'
import { ref, computed, watch, onMounted } from 'vue'
import { useConfigStore, useDocumentTreeStore, useWorkspacesStore } from 'source/pinia'
import { pathBasename } from '@common/util/renderer-path-polyfill'

const ipcRenderer = window.ipc

const documentTreeStore = useDocumentTreeStore()
const configStore = useConfigStore()
const workspacesStore = useWorkspacesStore()

export interface OutboundLink {
  link: string // The link text
  targetFilePath: string | undefined // The target file in case the link points to a file
  files: string[] // List of files that have that link
  hideFileSet: boolean // Whether to hide in sidebar
}

defineProps({
  notInToc: Boolean
})

const emit = defineEmits<(e: 'jtl', filePath: string, lineNumber: number, openInNewTab: boolean) => void>()

const searchParams = new URLSearchParams(window.location.search)
const windowId = searchParams.get('window_id')
if (windowId === null) {
  throw new Error('windowID was null')
}

const hideBacklinks = ref<boolean>(true)
const hideUnlinkedMentions = ref<boolean>(true)
const hideOutboundLinks = ref<boolean>(true)
const maxWeight = ref<number>(0)
const toggleStateBacklinks = ref<boolean>(false)
const toggleStateUnlinked = ref<boolean>(false)
const toggleStateOutbound = ref<boolean>(false)
const backlinks = ref<SearchResultWrapper>([])
const unlinkedMentions = ref<SearchResultWrapper>([])
const outboundLinks = ref<OutboundLink>([])

const numBacklinks = computed(() => {
  let sum = 0
  backlinks.value.forEach((x) => {
    sum += x.result.length
  })
  return sum
})
const numUnlinkedMentions = computed(() => {
  let sum = 0
  unlinkedMentions.value.forEach((x) => {
    sum += x.result.length
  })
  return sum
})

function getTitle (name: string, num: number): string {
  return name + ' (' + num + ')'
}
const numOutboundLinks = computed(() => outboundLinks.value.length)
const backlinksTitle = computed(() => getTitle('Backlinks', numBacklinks.value))
const unlinkedMentionsTitle = computed(() => getTitle('Unlinked Mentions', numUnlinkedMentions.value))
const outboundLinksTitle = computed(() => getTitle('Outbound links', numOutboundLinks.value))

const lastLeafId = computed(() => documentTreeStore.lastLeafId)
const lastActiveFile = computed(() => documentTreeStore.lastLeafActiveFile)
const recentSearchQuery = computed(() => configStore.config.window.recentGlobalSearches)
const fileTree = computed(() => workspacesStore.rootDescriptors)

watch(lastActiveFile, () => {
  recomputeBacklinksAndMentions().catch(err => console.error('Could not recompute backlinks:', err))
  recomputeOutboundLinks().catch(err => console.error('Could not recompute outbound links:', err))
})

onMounted(() => {
  recomputeBacklinksAndMentions().catch(err => console.error('Could not recompute backlinks:', err))
  recomputeOutboundLinks().catch(err => console.error('Could not recompute outbound links:', err))
  ipcRenderer.on('documents-update', (e, { event, context }) => {
    if (event === DP_EVENTS.FILE_SAVED) {
      recomputeBacklinksAndMentions().catch(err => console.error('Could not recompute backlinks:', err))
      recomputeOutboundLinks().catch(err => console.error('Could not recompute outbound links:', err))
    }
  })
})

async function recomputeBacklinksAndMentions (): Promise<void> {
  console.log('recomputeBacklinksAndMentions')
  if (lastActiveFile.value === undefined) {
    backlinks.value = []
    unlinkedMentions.value = []
    return
  }

  let unlinkedMentionsLocal: SearchResultWrapper[] = []
  let backlinksLocal: SearchResultWrapper[] = []

  // Get file name
  const fileNameMd = pathBasename(lastActiveFile.value.path)
  const activeFileName = fileNameMd.slice(0, -3)
  const fileNameLink = '[[' + activeFileName + ']]'
  const fileNameLinkWithTitle = '[[' + activeFileName + '|'
  const fileNameExact = '"' + activeFileName + '"'

  // First, get all mentions
  // Note, we store it into unlinkedMentionsLocal, but later we extract
  // all the backlinksLocal out of that array.
  unlinkedMentionsLocal = await search(fileNameExact)

  // Separate backlinksLocal from rest
  let skipMe = false
  let maxWeight = 0
  for (let i = unlinkedMentionsLocal.length - 1; i >= 0; i--) {
    maxWeight = 0

    // Current result set
    const x = unlinkedMentionsLocal[i]

    // Remove if the result set is from the current file itself
    if (!skipMe && x.file.filename === fileNameMd) {
      unlinkedMentionsLocal.splice(i, 1)

      // This is an optimization since this if statement can only evaluate
      // to true at most once.
      skipMe = true
      continue
    }

    let tmpBacklinks: any[] = []

    // Iterate over the lines of the current result set
    for (let j = x.result.length - 1; j >= 0; j--) {
      const isBacklink: boolean = (x.result[j].restext.includes(fileNameLink) ||
                                    x.result[j].restext.includes(fileNameLinkWithTitle)
      )
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
          unlinkedMentionsLocal.splice(i, 1)
          break
        }
      }
    }

    // There were backlinksLocal in the current result set
    if (tmpBacklinks.length > 0) {
      const newResult: SearchResultWrapper = {
        file: x.file,
        result: tmpBacklinks,
        hideResultSet: true,
        weight: tmpBacklinks.reduce(
          (accumulator: number, currentValue: SearchResult) => {
            return accumulator + currentValue.weight
          },
          0
        )
      }

      backlinksLocal.unshift(newResult)

      if (newResult.weight > maxWeight) {
        maxWeight = newResult.weight
      }

      // sort
      backlinksLocal.sort((a, b) => b.weight - a.weight)
    }
  }

  backlinks.value = backlinksLocal
  unlinkedMentions.value = unlinkedMentionsLocal
}

async function recomputeOutboundLinks (): Promise<void> {
  console.log('recomputeOutboundLinks')
  if (lastActiveFile.value === undefined) {
    outboundLinks.value = []
    return
  }

  const outboundLinksLocal: OutboundLink[] = []

  // Get ALL (= file + non-file) outbound links
  const { links } = await ipcRenderer.invoke('link-provider', {
    command: 'get-all-outbound-links',
    payload: { filePath: lastActiveFile.value.path }
  }) as { links: string[] }

  // For each outbound link, get the list of files that also contain that link
  for (const link of links) {
    let { files } = await ipcRenderer.invoke('link-provider', {
      command: 'get-files-with-link',
      payload: { link }
    }) as { files: string[] }

    // Remove the active file from the list of files
    files = files.filter((file) => file !== lastActiveFile.value.path)

    // Get the target file path in case the link points to an actual file
    let descriptor = await ipcRenderer.invoke('application', {
      command: 'find-exact',
      payload: link
    }) as MDFileDescriptor | undefined

    outboundLinksLocal.push(
      {
        link,
        targetFilePath: descriptor?.path,
        files,
        hideFileSet: true
      }
    )
  }

  // Sort so that links with more files are shown at the top
  outboundLinksLocal.sort((a, b) => (b.files.length - a.files.length))

  // console.log('Update outbound links for file ', activeFile.path, ':')
  // for (const link of outboundLinksLocal) {
  //   console.log('Link: ', link.link)
  //   console.info('Files: ', link.files)
  // }
  outboundLinks.value = outboundLinksLocal
}

function recentSearchQueryMatches (text: string): boolean {
  return (recentSearchQuery.value.includes(text))
}

async function search (query: string): Promise<SearchResultWrapper[]> {
  let filesToSearch: any[] = []
  const results: SearchResultWrapper[] = []

  const useH1: boolean =
    configStore.config.fileNameDisplay.includes('heading')
  const useTitle: boolean =
    configStore.config.fileNameDisplay.includes('title')

  // Get files we need to search
  for (const treeItem of fileTree.value) {
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
    const fileToSearch = filesToSearch.shift()

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
        hideResultSet: true, // If true, the individual results won't be displayed
        weight: result.reduce(
          (accumulator: number, currentValue: SearchResult) => {
            return accumulator + currentValue.weight
          },
          0 // This is the initialValue, b/c we're summing up props
        )
      }
      results.push(newResult)

      // if (newResult.weight > maxWeight) {
      //   maxWeight = newResult.weight
      // }

      // sort
      results.sort((a, b) => b.weight - a.weight)
    }
  }
  return results
}

function toggleResults (type: string): void {
  if (type === 'backlinks') {
    toggleStateBacklinks.value = !toggleStateBacklinks.value
    for (const b of backlinks.value) {
      b.hideResultSet = toggleStateBacklinks.value
    }
  } else if (type === 'unlinked') {
    toggleStateUnlinked.value = !toggleStateUnlinked.value
    for (const u of unlinkedMentions.value) {
      u.hideResultSet = toggleStateUnlinked.value
    }
  } else if (type === 'outbound') {
    toggleStateOutbound.value = !toggleStateOutbound.value
    for (const n of outboundLinks.value) {
      n.hideFileSet = toggleStateOutbound.value
    }
  }
}

// **** Copied/adapted from GlobalSearch.vue ****
function onResultClick (
  event: MouseEvent,
  filePath: string,
  lineNumber: number
): void {
  // This intermediary function is needed to make sure that jumpToLine can
  // also be called from within the context menu (see above).
  if (event.button === 2) {
    return // Do not handle right-clicks
  }

  const isMiddleClick = event.type === 'mousedown' && event.button === 1
  jumpToLine(filePath, lineNumber, isMiddleClick)
}

// **** Adapted from GlobalSearch.vue ****
function jumpToLine (filePath: string, lineNumber: number, openInNewTab: boolean = false): void {
  emit('jtl', filePath, lineNumber + 1, openInNewTab)
}

// **** Copied from GlobalSearch.vue ****
function markText (resultObject: SearchResult): string {
  return markTextShared(resultObject)
}

function getFileName (absolutePath: string): string {
  return pathBasename(absolutePath, '.md')
}

function getLinkStr (link: OutboundLink): string {
  const linkText = link.link
  // Add number of files if any
  if (link.files.length > 0) {
    return linkText + ' — (' + link.files.length + ')'
  }
  return linkText
}

function onSearchClick (link: OutboundLink): void {
  const linkText = link.link
  ipcRenderer.invoke('application', {
    command: 'start-global-search',
    payload: linkText
  })
    .catch(err => console.error(err))

  // Also copy the link to the clipboard
  copyZknLink(linkText)
}

// **** Copied from RelatedFilesTab.vue ****
function requestFile (event: MouseEvent, filePath: string): void {
  ipcRenderer.invoke('documents-provider', {
    command: 'open-file',
    payload: {
      path: filePath,
      windowId: windowId,
      leafId: lastLeafId,
      newTab: event.type === 'mousedown' && event.button === 1
    }
  })
    .catch(e => console.error(e))
}

function linkIsFile (link: OutboundLink): boolean {
  return (link.targetFilePath !== undefined)
}

// Returns true if the outbound link also links back to the active file
function hasBacklink (link: OutboundLink): boolean {
  return backlinks.value.some((b) => b.file.path === link.targetFilePath)
}
</script>

<style lang="less">
div.backlinks-container {
  border-bottom: 1px solid rgb(180, 180, 180);
  padding: 10px;
  overflow: hidden;
  font-size: 14px;
  div.filename {
    white-space: nowrap;
    font-weight: bold;
    display: flex;
    justify-content: space-between;
    margin-bottom: 5px;
    div.overflow-hidden {
      overflow: hidden;
    }
    div.buttons {
      display: flex;
    }
  }
  div.filepath {
    color: rgb(131, 131, 131);
    font-size: 10px;
    white-space: nowrap;
    overflow: hidden;
    margin-bottom: 5px;
  }
  div.result-line {
    padding: 5px;
    font-size: 12px;
    &:hover {
      background-color: rgb(200, 200, 200);
    }
    .search-result-highlight {
      font-weight: bold;
      color: var(--system-accent-color);
    }
  }
}
.mentions-toggle {
  padding-left: 10px;
}

.controls {
  margin-left: 5px;

  &:hover {
    cursor: pointer;
    background-color: rgb(200, 200, 200);
  }
}

.backlink-arrow-icon {
  margin-left: 5px;
}

.highlight-outbound {
  background: rgb(99, 255, 221);
}
</style>
@common/util/renderer-path-polyfill
