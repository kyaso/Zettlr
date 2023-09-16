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
          }}{{ result.file.relativeDirectoryPath !== '' ? sep : ''
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
          }}{{ result.file.relativeDirectoryPath !== '' ? sep : ''
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

<script lang="ts">
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

import ButtonControl from '@common/vue/form/elements/Button.vue'
import { SearchResult, SearchResultWrapper, SearchTerm } from '@dts/common/search'
import { defineComponent } from '@vue/runtime-core'
import { markText } from '../shared'
import { copyZknLink } from '@common/util/clipboard'
import { DP_EVENTS, OpenDocument } from '@dts/common/documents'
import objectToArray from '@common/util/object-to-array'
import compileSearchTerms from '@common/util/compile-search-terms'
import { MDFileDescriptor } from '@dts/common/fsal'

const path = window.path
const ipcRenderer = window.ipc

export interface OutboundLink {
  link: string // The link text
  targetFilePath: string | undefined // The target file in case the link points to a file
  files: string[] // List of files that have that link
  hideFileSet: Boolean // Whether to hide in sidebar
}

export default defineComponent({
  name: 'BacklinksTab',
  components: {
    ButtonControl
  },
  props: {
    notInToc: Boolean
  },
  emits: ['jtl'],
  data () {
    const searchParams = new URLSearchParams(window.location.search)
    return {
      windowId: searchParams.get('window_id') as string,
      hideBacklinks: true,
      hideUnlinkedMentions: true,
      hideOutboundLinks: true,
      maxWeight: 0,
      toggleStateBacklinks: false,
      toggleStateUnlinked: false,
      toggleStateOutbound: false,
      backlinks: [] as SearchResultWrapper[],
      unlinkedMentions: [] as SearchResultWrapper[],
      outboundLinks: [] as OutboundLink[]
    }
  },
  computed: {
    sep: function (): string {
      return path.sep
    },
    numBacklinks: function (): number {
      let sum = 0
      this.backlinks.forEach((x) => {
        sum += x.result.length
      })
      return sum
    },
    numUnlinkedMentions: function (): number {
      let sum = 0
      this.unlinkedMentions.forEach((x) => {
        sum += x.result.length
      })
      return sum
    },
    numOutboundLinks: function (): number {
      return this.outboundLinks.length
    },
    backlinksTitle: function (): string {
      return ('Backlinks (' + this.numBacklinks + ')')
    },
    unlinkedMentionsTitle: function (): string {
      return ('Unlinked Mentions (' + this.numUnlinkedMentions + ')')
    },
    outboundLinksTitle: function (): string {
      return ('Outbound links (' + this.numOutboundLinks + ')')
    },
    // **** Copied from RelatedFilesTab.vue ****
    lastLeafId: function (): string {
      return this.$store.state.lastLeafId
    },
    lastActiveFile: function (): OpenDocument|null {
      return this.$store.getters.lastLeafActiveFile()
    },
    recentSearchQuery: function (): string {
      return this.$store.state.config['window.recentGlobalSearches'][0]
    }
  },
  watch: {
    // Adapted from RelatedFilesTab.vue
    lastActiveFile (oldval, newval) {
      this.recomputeBacklinksAndMentions().catch(err => console.error('Could not recompute backlinks:', err))
      this.recomputeOutboundLinks().catch(err => console.error('Could not recompute outbound links:', err))
    }
  },
  mounted () {
    this.recomputeBacklinksAndMentions().catch(err => console.error('Could not recompute backlinks:', err))
    this.recomputeOutboundLinks().catch(err => console.error('Could not recompute outbound links:', err))
    ipcRenderer.on('documents-update', (e, { event, context }) => {
      if (event === DP_EVENTS.FILE_SAVED) {
        this.recomputeBacklinksAndMentions().catch(err => console.error('Could not recompute backlinks:', err))
        this.recomputeOutboundLinks().catch(err => console.error('Could not recompute outbound links:', err))
      }
    })
  },
  methods: {
    recentSearchQueryMatches: function (text: string): boolean {
      return (text.includes(this.recentSearchQuery) || this.recentSearchQuery.includes(text))
    },
    search: async function (query: string): Promise<SearchResultWrapper[]> {
      let filesToSearch: any[] = []
      const results: SearchResultWrapper[] = []

      const useH1: boolean =
        this.$store.state.config.fileNameDisplay.includes('heading')
      const useTitle: boolean =
        this.$store.state.config.fileNameDisplay.includes('title')

      // Get files we need to search
      for (const treeItem of this.$store.state.fileTree) {
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
    },
    recomputeBacklinksAndMentions: async function (): Promise<void> {
      console.log('recomputeBacklinksAndMentions')
      if (this.lastActiveFile === null) {
        this.backlinks = []
        this.unlinkedMentions = []
        return
      }

      let unlinkedMentions: SearchResultWrapper[] = []
      let backlinks: SearchResultWrapper[] = []

      // Get file name
      const fileNameMd = path.basename(this.lastActiveFile.path)
      const activeFileName = fileNameMd.slice(0, -3)
      const fileNameLink = '[[' + activeFileName + ']]'
      const fileNameExact = '"' + activeFileName + '"'

      // First, get all mentions
      // Note, we store it into unlinkedMentions, but later we extract
      // all the backlinks out of that array.
      unlinkedMentions = await this.search(fileNameExact)

      // Separate backlinks from rest
      let skipMe = false
      let maxWeight = 0
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
            hideResultSet: true,
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

      this.backlinks = backlinks
      this.unlinkedMentions = unlinkedMentions
    },
    recomputeOutboundLinks: async function (): Promise<void> {
      console.log('recomputeOutboundLinks')
      if (this.lastActiveFile === null) {
        this.outboundLinks = []
        return
      }

      const outboundLinks: OutboundLink[] = []

      // Get ALL (= file + non-file) outbound links
      const { links } = await ipcRenderer.invoke('link-provider', {
        command: 'get-all-outbound-links',
        payload: { filePath: this.lastActiveFile.path }
      }) as { links: string[] }

      // For each outbound link, get the list of files that also contain that link
      for (const link of links) {
        let { files } = await ipcRenderer.invoke('link-provider', {
          command: 'get-files-with-link',
          payload: { link }
        }) as { files: string[] }

        // Remove the active file from the list of files
        files = files.filter((file) => file !== this.lastActiveFile.path)

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
            hideFileSet: true
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
      this.outboundLinks = outboundLinks
    },
    // **** Adapted from GlobalSearch.vue ****
    toggleResults (type: string): void {
      if (type === 'backlinks') {
        this.toggleStateBacklinks = !this.toggleStateBacklinks
        for (const b of this.backlinks) {
          b.hideResultSet = this.toggleStateBacklinks
        }
      } else if (type === 'unlinked') {
        this.toggleStateUnlinked = !this.toggleStateUnlinked
        for (const u of this.unlinkedMentions) {
          u.hideResultSet = this.toggleStateUnlinked
        }
      } else if (type === 'outbound') {
        this.toggleStateOutbound = !this.toggleStateOutbound
        for (const n of this.outboundLinks) {
          n.hideFileSet = this.toggleStateOutbound
        }
      }
    },
    // **** Copied/adapted from GlobalSearch.vue ****
    onResultClick: function (
      event: MouseEvent,
      filePath: string,
      lineNumber: number
    ) {
      // This intermediary function is needed to make sure that jumpToLine can
      // also be called from within the context menu (see above).
      if (event.button === 2) {
        return // Do not handle right-clicks
      }

      const isMiddleClick = event.type === 'mousedown' && event.button === 1
      this.jumpToLine(filePath, lineNumber, isMiddleClick)
    },
    // **** Adapted from GlobalSearch.vue ****
    jumpToLine: function (filePath: string, lineNumber: number, openInNewTab: boolean = false) {
      this.$emit('jtl', filePath, lineNumber + 1, openInNewTab)
    },
    // **** Copied from GlobalSearch.vue ****
    markText: function (resultObject: SearchResult) {
      return markText(resultObject)
    },
    getFileName: function (absolutePath: string): string {
      return path.basename(absolutePath, '.md')
    },
    getLinkStr: function (link: OutboundLink): string {
      const linkWithBrackets = '[[ ' + link.link + ' ]]'
      // Add number of files if any
      if (link.files.length > 0) {
        return linkWithBrackets + ' - (' + link.files.length + ')'
      }
      return linkWithBrackets
    },
    onSearchClick: function (link: OutboundLink) {
      const linkText = link.link
      ipcRenderer.invoke('application', {
        command: 'start-global-search',
        payload: linkText
      })
        .catch(err => console.error(err))

      // Also copy the link to the clipboard
      copyZknLink(linkText)
    },
    // **** Copied from RelatedFilesTab.vue ****
    requestFile: function (event: MouseEvent, filePath: string) {
      ipcRenderer.invoke('documents-provider', {
        command: 'open-file',
        payload: {
          path: filePath,
          windowId: this.windowId,
          leafId: this.lastLeafId,
          newTab: event.type === 'mousedown' && event.button === 1
        }
      })
        .catch(e => console.error(e))
    },
    linkIsFile: function (link: OutboundLink) {
      return (link.targetFilePath !== undefined)
    },
    // Returns true if the outbound link also links back to the active file
    hasBacklink: function (link: OutboundLink): Boolean {
      return this.backlinks.some((b) => b.file.path === link.targetFilePath)
    }
  }
})
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
