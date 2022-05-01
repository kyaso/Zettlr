<template>
  <div id="sidebar">
    <TabBar
      v-bind:tabs="tabs"
      v-bind:current-tab="currentTab"
      v-on:tab="setCurrentTab($event)"
    ></TabBar>

    <!-- Now the tab containers -->
    <div
      v-if="currentTab === 'toc'"
      role="tabpanel"
      id="sidebar-toc-id"
    >
      <!-- Table of Contents -->
      <h1>{{ tocLabel }}</h1>
      <!-- Show the ToC entries -->
      <div
        v-for="(entry, idx) of tableOfContents"
        v-bind:key="idx"
        class="toc-entry-container"
        v-bind:style="{
          'margin-left': `${entry.level * 10}px`
        }"
        v-on:click="($root as any).jtl(entry.line, true, true)"
      >
        <div class="toc-level">
          {{ entry.renderedLevel }}
        </div>
        <div
          v-bind:class="{ 'toc-entry': true, 'toc-entry-active': tocEntryIsActive(entry.line, idx) }"
          v-bind:data-line="entry.line"
          v-html="entry.text"
        ></div>
      </div>
    </div>

    <div
      v-if="currentTab === 'toc' || currentTab === 'relatedFiles'"
      role="tabpanel"
      v-bind:class="{ 'sidebar-related-in-toc': currentTab === 'toc' }"
    >
      <h1>{{ relatedFilesLabel }}</h1>
      <div class="related-files-container">
        <div v-if="relatedFiles.length === 0">
          {{ noRelatedFilesMessage }}
        </div>
        <div v-else>
          <div
            v-for="fileRecord, idx in relatedFiles"
            v-bind:key="idx"
            v-bind:class="{
              'related-file': true,
              'tags': fileRecord.tags.length > 0,
              'inbound': fileRecord.link === 'inbound',
              'outbound': fileRecord.link === 'outbound',
              'bidirectional': fileRecord.link === 'bidirectional'
            }"
          >
            <span
              class="filename"
              v-bind:title="fileRecord.path"
              draggable="true"
              v-on:mousedown.stop="requestFile($event, fileRecord.path)"
              v-on:dragstart="beginDragRelatedFile($event, fileRecord.path)"
            >{{ getRelatedFileName(fileRecord.path) }}</span>
            <span class="icons">
              <clr-icon
                v-if="fileRecord.tags.length > 0"
                shape="tag"
                title="This relation is based on tag similarity."
              ></clr-icon>
              <clr-icon
                v-if="fileRecord.link === 'inbound'"
                shape="arrow left"
                title="This relation is based on a backlink."
              ></clr-icon>
              <clr-icon
                v-else-if="fileRecord.link === 'outbound'"
                shape="arrow right"
                title="This relation is based on an outbound link."
              ></clr-icon>
              <clr-icon
                v-else-if="fileRecord.link === 'bidirectional'"
                shape="two-way-arrows"
                title="This relation is based on a bidirectional link."
              ></clr-icon>
            </span>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="currentTab === 'references'"
      role="tabpanel"
    >
      <!-- References -->
      <h1>{{ referencesLabel }}</h1>
      <!-- Will contain the actual HTML -->
      <div v-html="referenceHTML"></div>
    </div>

    

    <div
      v-if="currentTab === 'attachments'"
      role="tabpanel"
    >
      <!-- Other files contents -->
      <h1>
        {{ otherFilesLabel }}
        <clr-icon
          id="open-dir-external"
          v-bind:title="openDirLabel"
          shape="folder"
          class="is-solid"
        ></clr-icon>
      </h1>

      <!-- Render all attachments -->
      <p v-if="attachments.length === 0">
        {{ noAttachmentsMessage }}
      </p>
      <template v-else>
        <a
          v-for="(attachment, idx) in attachments"
          v-bind:key="idx"
          class="attachment"
          draggable="true"
          v-bind:data-link="attachment.path"
          v-bind:data-hash="attachment.hash"
          v-bind:title="attachment.path"
          v-bind:href="`safe-file://${attachment.path}`"
          v-on:dragstart="handleDragStart($event, attachment.path)"
        >
          <span v-html="getIcon(attachment.path)"></span>
          {{ attachment.name }}
        </a>
      </template>
    </div>

    <!-- Linked/Unlinked Mentions -->
    <div
      v-if="currentTab === 'mentions'"
      role="tabpanel"
    >
      <h1 class="backlinks-title" v-on:click="hideBacklinks = !hideBacklinks">
        Backlinks ({{ numBacklinks }})
      </h1>

      <div v-if="!hideBacklinks">
        <ButtonControl
          class="mentions-toggle"
          v-bind:label="'Toggle'"
          v-bind:inline="true"
          v-on:click="toggleResults('backlinks')"
        ></ButtonControl>

        <!-- Copied and adapted from GlobalSearch.vue -->
        <div
          v-for="result, idx in backlinks"
          v-bind:key="idx"
          class="backlinks-container"
        >
          <div class="filename" v-on:click="result.hideResultSet = !result.hideResultSet">
            <!--
              NOTE: This DIV is just here due to the parent item's "display: flex",
              such that the filename plus indicator icon are floated to the left,
              while the collapse icon is floated to the right.
            -->
            <div class="overflow-hidden">
              <clr-icon v-if="result.weight / maxWeight < 0.3" shape="dot-circle" style="fill: #aaaaaa"></clr-icon>
              <clr-icon v-else-if="result.weight / maxWeight < 0.7" shape="dot-circle" style="fill: #2975d9"></clr-icon>
              <clr-icon v-else shape="dot-circle" style="fill: #33aa33"></clr-icon>
              {{ result.file.displayName }}
            </div>

            <div class="collapse-icon">
              <clr-icon v-bind:shape="(result.hideResultSet) ? 'caret left' : 'caret down'"></clr-icon>
            </div>
          </div>
          <div class="filepath">
            {{ result.file.relativeDirectoryPath }}{{ (result.file.relativeDirectoryPath !== '') ? sep : '' }}{{ result.file.filename }}
          </div>
          <div v-if="!result.hideResultSet" class="results-container">
            <div
              v-for="singleRes, idx2 in result.result"
              v-bind:key="idx2"
              class="result-line"
              v-on:contextmenu.stop.prevent="fileContextMenu($event, result.file.path, singleRes.line)"
              v-on:mousedown.stop.prevent="onResultClick($event, idx, idx2, result.file.path, singleRes.line)"
            >
              <span v-if="singleRes.line !== -1"><strong>{{ singleRes.line }}</strong>: </span>
              <span v-html="markText(singleRes)"></span>
            </div>
          </div>
        </div> <!-- v-for -->
      </div> <!-- hideBacklinks -->

      <hr>

      <h1 class="backlinks-title" v-on:click="hideUnlinkedMentions = !hideUnlinkedMentions">
        Unlinked Mentions ({{ numUnlinkedMentions }})
      </h1>

      <div v-if="!hideUnlinkedMentions">
        <ButtonControl
          class="mentions-toggle"
          v-bind:label="'Toggle'"
          v-bind:inline="true"
          v-on:click="toggleResults('unlinked')"
        ></ButtonControl>

        <!-- Copied and adapted from GlobalSearch.vue -->
        <div
          v-for="result, idx in unlinkedMentions"
          v-bind:key="idx"
          class="backlinks-container"
        >
          <div class="filename" v-on:click="result.hideResultSet = !result.hideResultSet">
            <!--
              NOTE: This DIV is just here due to the parent item's "display: flex",
              such that the filename plus indicator icon are floated to the left,
              while the collapse icon is floated to the right.
            -->
            <div class="overflow-hidden">
              <clr-icon v-if="result.weight / maxWeight < 0.3" shape="dot-circle" style="fill: #aaaaaa"></clr-icon>
              <clr-icon v-else-if="result.weight / maxWeight < 0.7" shape="dot-circle" style="fill: #2975d9"></clr-icon>
              <clr-icon v-else shape="dot-circle" style="fill: #33aa33"></clr-icon>
              {{ result.file.displayName }}
            </div>

            <div class="collapse-icon">
              <clr-icon v-bind:shape="(result.hideResultSet) ? 'caret left' : 'caret down'"></clr-icon>
            </div>
          </div>
          <div class="filepath">
            {{ result.file.relativeDirectoryPath }}{{ (result.file.relativeDirectoryPath !== '') ? sep : '' }}{{ result.file.filename }}
          </div>
          <div v-if="!result.hideResultSet" class="results-container">
            <div
              v-for="singleRes, idx2 in result.result"
              v-bind:key="idx2"
              class="result-line"
              v-on:contextmenu.stop.prevent="fileContextMenu($event, result.file.path, singleRes.line)"
              v-on:mousedown.stop.prevent="onResultClick($event, idx, idx2, result.file.path, singleRes.line)"
            >
              <span v-if="singleRes.line !== -1"><strong>{{ singleRes.line }}</strong>: </span>
              <span v-html="markText(singleRes)"></span>
            </div>
          </div>
        </div> <!-- v-for -->
      </div> <!-- hideUnlinkedMentions -->
    </div>
  </div>
</template>

<script lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Sidebar
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This component renders the sidebar.
 *
 * END HEADER
 */

import { trans } from '@common/i18n-renderer'
import { ClarityIcons } from '@clr/icons'
import TabBar from '@common/vue/TabBar.vue'
import ButtonControl from '@common/vue/form/elements/Button.vue'
import { defineComponent } from 'vue'
import { CodeFileMeta, DirMeta, MDFileMeta, OtherFileMeta } from '@dts/common/fsal'
import { TabbarControl } from '@dts/renderer/window'
import showPopupMenu from '@common/modules/window-register/application-menu-helper'

import { SearchResult, SearchResultWrapper, SearchTerm } from '@dts/common/search'
import compileSearchTerms from '@common/util/compile-search-terms'
import objectToArray from '@common/util/object-to-array'
import { AnyMenuItem } from '@dts/renderer/context'

const path = window.path
const ipcRenderer = window.ipc

interface RelatedFile {
  file: string
  path: string
  tags: string[]
  link: 'inbound'|'outbound'|'bidirectional'|'none'
}

export default defineComponent({
  name: 'MainSidebar',
  components: {
    TabBar,
    ButtonControl
  },
  emits: ['jtl'],
  data: function () {
    return {
      bibContents: undefined as undefined|any[],
      relatedFiles: [] as RelatedFile[],
      backlinks: [] as SearchResultWrapper[],
      hideBacklinks: true,
      unlinkedMentions: [] as SearchResultWrapper[],
      hideUnlinkedMentions: true,
      maxWeight: 0,
      jtlIntent: undefined as undefined|number,
      jtlIntentFlash: undefined as undefined|number,
      toggleState: false
    }
  },
  computed: {
    currentTab: function (): string {
      return this.$store.state.config['window.currentSidebarTab']
    },
    tabs: function (): TabbarControl[] {
      return [
        {
          icon: 'indented-view-list',
          id: 'toc',
          target: 'sidebar-toc',
          label: this.tocLabel
        },
        {
          icon: 'file-group',
          id: 'relatedFiles',
          target: 'sidebar-related-files',
          label: this.relatedFilesLabel
        },
        {
          icon: 'book',
          id: 'references',
          target: 'sidebar-bibliography',
          label: this.referencesLabel
        },
        {
          icon: 'attachment',
          id: 'attachments',
          target: 'sidebar-files',
          label: this.otherFilesLabel
        },
        {
          icon: 'link',
          id: 'mentions',
          target: 'sidebar-mentions',
          label: 'Mentions'
        }
      ]
    },
    otherFilesLabel: function (): string {
      return trans('gui.other_files')
    },
    referencesLabel: function (): string {
      return trans('gui.citeproc.references_heading')
    },
    tocLabel: function (): string {
      return trans('gui.table_of_contents')
    },
    relatedFilesLabel: function (): string {
      return trans('gui.related_files_label')
    },
    openDirLabel: function (): string {
      return trans('gui.attachments_open_dir')
    },
    noAttachmentsMessage: function (): string {
      return trans('gui.no_other_files')
    },
    noRelatedFilesMessage: function (): string {
      return trans('gui.no_related_files')
    },
    attachments: function (): OtherFileMeta[] {
      const currentDir = this.$store.state.selectedDirectory as DirMeta|null
      if (currentDir === null) {
        return []
      } else {
        const extensions: string[] = this.$store.state.config.attachmentExtensions
        const attachments = currentDir.children.filter(child => child.type === 'other') as OtherFileMeta[]
        return attachments.filter(attachment => extensions.includes(attachment.ext))
      }
    },
    activeFile: function (): MDFileMeta|null {
      return this.$store.state.activeFile
    },
    activeFileName: function (): string|undefined {
      return this.activeFile?.name.slice(0, -3)
    },
    activeDocumentInfo: function (): any|null {
      return this.$store.state.activeDocumentInfo
    },
    modifiedFiles: function (): string[] {
      return this.$store.state.modifiedDocuments
    },
    tableOfContents: function (): any|null {
      return this.$store.state.tableOfContents
    },
    citationKeys: function (): string[] {
      return this.$store.state.citationKeys
    },
    referenceHTML: function (): string {
      if (this.bibContents === undefined || this.bibContents[1].length === 0) {
        return `<p>${trans('gui.citeproc.references_none')}</p>`
      } else {
        const html = [this.bibContents[0].bibstart]

        for (const entry of this.bibContents[1]) {
          html.push(entry)
        }

        html.push(this.bibContents[0].bibend)

        return html.join('\n')
      }
    },
    useH1: function (): boolean {
      return this.$store.state.config.fileNameDisplay.includes('heading')
    },
    useTitle: function (): boolean {
      return this.$store.state.config.fileNameDisplay.includes('title')
    },
    displayMdExtensions: function (): boolean {
      return this.$store.state.config['display.markdownFileExtensions']
    },
    sep: function (): string {
      return path.sep
    },
    fileTree: function (): Array<MDFileMeta|CodeFileMeta|DirMeta> {
      return this.$store.state.fileTree
    },
    numBacklinks: function (): number {
      let sum = 0
      this.backlinks.forEach(x => { sum += x.result.length })
      return sum
    },
    numUnlinkedMentions: function (): number {
      let sum = 0
      this.unlinkedMentions.forEach(x => { sum += x.result.length })
      return sum
    }
  },
  watch: {
    citationKeys: function () {
      // Reload the bibliography
      this.updateReferences().catch(e => console.error('Could not update references', e))
    },
    activeFile: function () {
      this.updateRelatedFiles().catch(e => console.error('Could not update related files', e))
      this.updateMentions()
    },
    modifiedFiles: function () {
      if (this.activeFile == null) {
        return
      }

      // Update the related files when the current document is not modified to
      // immediately account for any changes in the related files.
      const activePath = this.activeFile.path
      if (!(activePath in this.modifiedFiles)) {
        this.updateRelatedFiles().catch(e => console.error('Could not update related files', e))
        // this.updateMentions() // If we enable this it will update on first change, and every save
      }
    },
    // Copied from GlobalSearch.vue
    //
    // We are sneaky here: The activeDocumentInfo is being updated *after* the
    // editor has completed switching to a new document. If we have a jtl
    // intent then, it is guaranteed that this means that our document has
    // finished loading and the editor is able to handle our request as it is
    // supposed to.
    activeDocumentInfo: function (newValue, oldValue) {
      // If we have an intention of jumping to a line,
      // do so and unset the intent again.
      if (this.jtlIntent !== undefined) {
        this.$emit('jtl', [ this.jtlIntent, true, true, this.jtlIntentFlash ])
        this.jtlIntent = undefined
        this.jtlIntentFlash = undefined
      }
    }
  },
  mounted: function () {
    ipcRenderer.on('citeproc-renderer', (event, { command, payload }) => {
      if (command === 'citeproc-bibliography') {
        this.bibContents = payload
      }
    })

    ipcRenderer.on('links', () => {
      this.updateRelatedFiles().catch(err => console.error(err))
      this.updateMentions()
    })

    try {
      this.updateReferences().catch(e => console.error('Could not update references', e))
    } catch (err) {
      console.error(err)
    }
    this.updateRelatedFiles().catch(e => console.error('Could not update related files', e))
    this.updateMentions()
  },
  methods: {
    setCurrentTab: function (which: string) {
      (global as any).config.set('window.currentSidebarTab', which)
    },
    updateReferences: async function () {
      // NOTE We're manually cloning the citationKeys array, since Proxies
      // cannot be cloned to be sent across the IPC bridge
      this.bibContents = await ipcRenderer.invoke('citeproc-provider', {
        command: 'get-bibliography',
        payload: this.citationKeys.map(e => e)
      })
    },
    updateRelatedFiles: async function () {
      // First reset, default is no related files
      this.relatedFiles = []
      if (this.activeFile === null || this.activeFile.type !== 'file') {
        return
      }

      const unreactiveList: RelatedFile[] = []

      // Then retrieve the inbound links first, since that is the most important
      // relation, so they should be on top of the list.
      const { inbound, outbound } = await ipcRenderer.invoke('link-provider', {
        command: 'get-inbound-links',
        payload: { filePath: this.activeFile.path }
      }) as { inbound: string[], outbound: string[]}

      for (const absPath of [ ...inbound, ...outbound ]) {
        const found = unreactiveList.find(elem => elem.path === absPath)
        if (found !== undefined) {
          continue
        }

        const related: RelatedFile = {
          file: path.basename(absPath),
          path: absPath,
          tags: [],
          link: 'none'
        }

        if (inbound.includes(absPath) && outbound.includes(absPath)) {
          related.link = 'bidirectional'
        } else if (inbound.includes(absPath)) {
          related.link = 'inbound'
        } else {
          related.link = 'outbound'
        }

        unreactiveList.push(related)
      }

      // The second way files can be related to each other is via shared tags.
      // This relation is not as important as explicit links, so they should
      // be below the inbound linked files.
      const recommendations = await ipcRenderer.invoke('tag-provider', {
        command: 'recommend-matching-files',
        payload: this.activeFile.tags.map(tag => tag) // De-proxy
      })

      // Recommendations come in the form of [file: string]: string[]
      for (const filePath of Object.keys(recommendations)) {
        const existingFile = unreactiveList.find(elem => elem.path === filePath)
        if (existingFile !== undefined) {
          // This file already links here
          existingFile.tags = recommendations[filePath]
        } else {
          // This file doesn't explicitly link here but it shares tags
          unreactiveList.push({
            file: path.basename(filePath),
            path: filePath,
            tags: recommendations[filePath],
            link: 'none'
          })
        }
      }

      // Now we have all relations based on either tags or backlinks. We must
      // now order them in such a way that the hierarchy is like that:
      // 1. Backlinks that also share common tags
      // 2. Backlinks that do not share common tags
      // 3. Files that only share common tags
      const backlinksAndTags = unreactiveList.filter(e => e.link !== 'none' && e.tags.length > 0)
      backlinksAndTags.sort((a, b) => { return b.tags.length - a.tags.length })

      const backlinksOnly = unreactiveList.filter(e => e.link !== 'none' && e.tags.length === 0)
      // No sorting necessary

      const tagsOnly = unreactiveList.filter(e => e.link === 'none')
      tagsOnly.sort((a, b) => { return b.tags.length - a.tags.length })

      this.relatedFiles = [ ...backlinksAndTags, ...backlinksOnly, ...tagsOnly ]

      // Filter out current file
      this.relatedFiles = this.relatedFiles.filter(f => f.path !== this.activeFile?.path)
    },
    updateMentions: async function () {
      // console.warn('updateMentions()')
      this.backlinks = []
      this.unlinkedMentions = []

      this.maxWeight = 0

      const fileNameLink = '[[' + this.activeFileName + ']]'
      const fileNameExact = '"' + this.activeFileName + '"'
      const fileNameMd = this.activeFile?.name

      this.unlinkedMentions = await this.search(fileNameExact)

      // Separate backlinks from rest
      let skipMe = false
      for (let i = this.unlinkedMentions.length - 1; i >= 0; i--) {
        this.maxWeight = 0

        // Current result set
        const x = this.unlinkedMentions[i]

        // Remove if the result set is from the current file itself
        if (!skipMe && (x.file.filename === fileNameMd)) {
          this.unlinkedMentions.splice(i, 1)
          // This is an optimization since this if statement can only evaluate
          // to true at most once.
          skipMe = true
          continue
        }

        let tmpBacklinks: any[] = []

        // Iterate over the lines of the current result set
        for (let j = x.result.length - 1; j >= 0; j--) {
          const isBacklink = x.result[j].restext.toLowerCase().includes(fileNameLink.toLowerCase())
          const isNegOne = x.result[j].line === -1

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
              this.unlinkedMentions.splice(i, 1)
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
            weight: tmpBacklinks.reduce((accumulator: number, currentValue: SearchResult) => {
              return accumulator + currentValue.weight
            }, 0)
          }
          this.backlinks.unshift(newResult)
          if (newResult.weight > this.maxWeight) {
            this.maxWeight = newResult.weight
          }

          // sort
          this.backlinks.sort((a, b) => b.weight - a.weight)
        }
      }
    },
    toggleResults (foo: string): void {
      if (foo === 'backlinks') {
        this.toggleState = !this.toggleState
        for (const b of this.backlinks) {
          b.hideResultSet = this.toggleState
        }
      } else if (foo === 'unlinked') {
        this.toggleState = !this.toggleState
        for (const u of this.unlinkedMentions) {
          u.hideResultSet = this.toggleState
        }
      }
    },
    fileContextMenu: function (event: MouseEvent, filePath: string, lineNumber: number) {
      const point = { x: event.clientX, y: event.clientY }

      const menu: AnyMenuItem[] = [{
        label: trans('menu.open_new_tab'),
        id: 'new-tab',
        type: 'normal',
        enabled: true
      }]

      showPopupMenu(point, menu, (clickedID: string) => {
        switch (clickedID) {
          case 'new-tab':
            // this.jumpToLine(filePath, lineNumber, true)
            this.onResultClick({} as MouseEvent, 0, 0, filePath, lineNumber, true)
            break
        }
      })
    },
    // **** Adapted from GlobalSearch.vue ****
    search: async function (query: string): Promise<SearchResultWrapper[]> {
      let filesToSearch: any[] = []
      const results: SearchResultWrapper[] = []

      // Get files we need to search
      for (const treeItem of this.fileTree) {
        if (treeItem.type !== 'directory') {
          let displayName = treeItem.name
          if (treeItem.type === 'file') {
            if (this.useTitle && typeof treeItem.frontmatter?.title === 'string') {
              displayName = treeItem.frontmatter.title
            } else if (this.useH1 && treeItem.firstHeading !== null) {
              displayName = treeItem.firstHeading
            }
          }

          filesToSearch.push({
            path: treeItem.path,
            relativeDirectoryPath: '',
            filename: treeItem.name,
            displayName: displayName,
            hash: treeItem.hash
          })
          continue
        }

        let dirContents = objectToArray(treeItem, 'children')
        dirContents = dirContents.filter(item => item.type !== 'directory')
        dirContents = dirContents.map(item => {
          let displayName = item.name
          if (this.useTitle && item.frontmatter != null && typeof item.frontmatter.title === 'string') {
            displayName = item.frontmatter.title
          } else if (this.useH1 && item.firstHeading !== null) {
            displayName = item.firstHeading
          }

          return {
            path: item.path,
            // Remove the workspace directory path itself so only the
            // app-internal relative path remains. Also, we're removing the leading (back)slash
            relativeDirectoryPath: item.dir.replace(treeItem.dir, '').substr(1),
            filename: item.name,
            displayName: displayName,
            hash: item.hash
          }
        })

        filesToSearch = filesToSearch.concat(dirContents)
      }

      // We have to compile because the 'file-search' command only accepts those
      const term: SearchTerm[] = compileSearchTerms(query)

      // Query index
      const tmp: [] = await ipcRenderer.invoke('application', {
        command: 'query-index',
        payload: {
          query: query
        }
      })

      // Filter filesToSearch
      filesToSearch = filesToSearch.filter(f => tmp.includes(f.hash))
      // console.log('filesToSearch after query filter: ', filesToSearch)

      // For each file to search, run the 'file-search' command
      while (filesToSearch.length > 0) {
        const fileToSearch = filesToSearch.shift() as LocalFile
        // Do search
        const result: SearchResult[] = await ipcRenderer.invoke('application', {
          command: 'file-search',
          payload: {
            path: fileToSearch.path,
            terms: term
          }
        })
        if (result.length > 0) {
          const newResult: SearchResultWrapper = {
            file: fileToSearch,
            result: result,
            hideResultSet: false,
            weight: result.reduce((accumulator: number, currentValue: SearchResult) => {
              return accumulator + currentValue.weight
            }, 0)
          }
          results.push(newResult)
          if (newResult.weight > this.maxWeight) {
            this.maxWeight = newResult.weight
          }

          // sort
          results.sort((a, b) => b.weight - a.weight)
        }
      }

      return results
    },
    // **** Copied/adapted from GlobalSearch.vue ****
    onResultClick: function (event: MouseEvent, idx: number, idx2: number, filePath: string, lineNumber: number, newTab = false) {
      // The value we are subtracting is the amount of lines we want to
      // show above the target line
      const lineToScroll = Math.max(lineNumber - this.$store.state.config['custom.test.val1'], 0)

      // This branch will be taking for all non-right clicks
      if (!newTab) {
        // This intermediary function is needed to make sure that jumpToLine can
        // also be called from within the context menu (see above).
        if (event.button === 2) {
          return // Do not handle right-clicks
        }

        // Update indeces so we can keep track of the most recently clicked
        // search result.
        // this.activeFileIdx = idx
        // this.activeLineIdx = idx2

        const isMiddleClick = (event.type === 'mousedown' && event.button === 1)
        this.jumpToLine(filePath, lineToScroll, isMiddleClick, lineNumber)
        // this.jumpToLine(filePath, lineNumber, isMiddleClick)
      } else {
        this.jumpToLine(filePath, lineToScroll, true, lineNumber)
      }
    },
    // Copied from GlobalSearch.vue
    jumpToLine: function (filePath: string, lineNumber: number, openInNewTab: boolean = false, lineToFlash: number = lineNumber) {
      const isActiveFile = (this.activeFile !== null) ? this.activeFile.path === filePath : false

      if (isActiveFile) {
        // App.vue will receive the event, and pass it on to MainEditor.vue::jtl().
        // That in turn calls the jtl() function in markdown-editor::index.ts. 
        this.$emit('jtl', [ lineNumber, true, true, lineToFlash ])
      } else {
        // The wanted file is not yet active -> Do so and then jump to the correct line
        ipcRenderer.invoke('application', {
          command: 'open-file',
          payload: {
            path: filePath,
            newTab: openInNewTab // Open in a new tab if wanted
          }
        })
          .then(() => {
            // As soon as the file becomes active, jump to that line. But only
            // if it's >= 0. If lineNumber === -1 it means just the file should
            // be open.
            if (lineNumber >= 0) {
              this.jtlIntent = lineNumber
              this.jtlIntentFlash = lineToFlash
            }
            // this.$emit('jtl', [ lineNumber, true, true, lineToFlash ])
          })
          .catch(e => console.error(e))
      }
    },
    // Copied from GlobalSearch.vue
    markText: function (resultObject: SearchResult) {
      const startTag = '<span class="search-result-highlight">'
      const endTag = '</span>'
      // We receive a result object and should return an HTML string containing
      // highlighting (we're using <strong>) where the result works. We have
      // access to restext, weight, line, and an array of from-to-ranges
      // indicating all matches on the given line. NOTE that all results are
      // being sorted correctly by the main process, so we can just assume the
      // results to be non-overlapping and from beginning to the end of the
      // line.
      let marked = resultObject.restext

      // "Why are you deep-cloning this array?" you may ask. Well, well. The
      // reason is that Vue will observe the original array. And, whenever an
      // observed thing -- be it an array or object -- is mutated, this will
      // cause Vue to update the whole component state. Array.prototype.reverse
      // actually mutates the array. So in order to prevent Vue from endlessly
      // updating the component, we'll pull out the values into an unobserved
      // cloned array that we can reverse without Vue getting stuck in an
      // infinite loop.
      const unobserved = resultObject.ranges.map(range => {
        return {
          from: range.from,
          to: range.to
        }
      })
      // Addendum Sun, 16 Jan 2022: If I had paid more attention to this little
      // curious fact here, I could've saved myself a lot of trouble with the
      // new Proxies of Vue3. For a short summary of my odyssee, see
      // https://www.hendrik-erz.de/post/death-by-proxy

      // Because it shifts positions, we need to insert the closing tag first
      for (const range of unobserved.reverse()) {
        marked = marked.substring(0, range.to) + endTag + marked.substring(range.to)
        marked = marked.substring(0, range.from) + startTag + marked.substring(range.from)
      }

      return marked
    },
    getIcon: function (attachmentPath: string) {
      const fileExtIcon = ClarityIcons.get('file-ext')
      if (typeof fileExtIcon === 'string') {
        return fileExtIcon.replace('EXT', path.extname(attachmentPath).slice(1, 4))
      } else {
        return ''
      }
    },
    /**
     * Adds additional data to the dragevent
     *
     * @param   {DragEvent}  event           The drag event
     * @param   {string}  attachmentPath  The path to add as a file
     */
    handleDragStart: function (event: DragEvent, attachmentPath: string) {
      // Indicate with custom data that this is a file from the sidebar
      event.dataTransfer?.setData('text/x-zettlr-other-file', attachmentPath)
    },
    requestFile: function (event: MouseEvent, filePath: string) {
      ipcRenderer.invoke('application', {
        command: 'open-file',
        payload: {
          path: filePath,
          newTab: event.type === 'mousedown' && event.button === 1
        }
      })
        .catch(e => console.error(e))
    },
    getRelatedFileName: function (filePath: string) {
      const descriptor = this.$store.getters.file(filePath)
      if (descriptor === null) {
        return filePath
      }

      if (this.useTitle && descriptor.frontmatter !== null && typeof descriptor.frontmatter.title === 'string') {
        return descriptor.frontmatter.title
      } else if (this.useH1 && descriptor.firstHeading !== null) {
        return descriptor.firstHeading
      } else if (this.displayMdExtensions) {
        return descriptor.name
      } else {
        return descriptor.name.replace(descriptor.ext, '')
      }
    },
    beginDragRelatedFile: function (event: DragEvent, filePath: string) {
      const descriptor = this.$store.getters.file(filePath)

      event.dataTransfer?.setData('text/x-zettlr-file', JSON.stringify({
        type: descriptor.type, // Can be file, code, or directory
        path: descriptor.path,
        id: descriptor.id // Convenience
      }))
    },
    /**
     * Whether the cursor is within the corresponding document section
     *
     * @param   {number}  tocEntryLine          Line number of section heading
     * @param   {number}  tocEntryIdx           Index of heading in ToC
     */
    tocEntryIsActive: function (tocEntryLine: number, tocEntryIdx: number) {
      const cursorLine = this.$store.state.activeDocumentInfo.cursor.line

      // Determine index of next heading in ToC list
      const nextTocEntryIdx = Math.min(tocEntryIdx + 1, this.tableOfContents.length - 1)

      // Now, determine the next heading's line number
      let nextTocEntryLine = Infinity
      if (tocEntryIdx !== nextTocEntryIdx) {
        nextTocEntryLine = this.tableOfContents[nextTocEntryIdx].line
      }

      // True, when cursor lies between current and next heading
      return (cursorLine >= tocEntryLine && cursorLine < nextTocEntryLine)
    }
  }
})
</script>

<style lang="less">
body {
  @button-margin: 5px;
  @border-radius: 5px;
  @button-size: 5px;
  @button-icon-size: 5px;

  #sidebar {
    background-color: rgb(230, 230, 230);
    height: 100%;
    width: 100%;
    overflow-y: auto;
    overflow-x: hidden;

    #sidebar-toc-id {
      overflow-y: auto;
      height: 70%;
    }

    .sidebar-related-in-toc {
      border-top: 3px solid grey;
      overflow-y: auto;
      height: 30%;
    }

    #open-dir-external {
      padding: @button-margin;
      border-radius: @border-radius;
      display: inline-block;
      width: @button-size;
      height: @button-size;

      clr-icon {
        width: @button-icon-size;
        height: @button-icon-size;
      }
    }

    h1 {
      padding: 10px;
      font-size: 16px;
    }

    p { padding: 10px; }

    a.attachment {
      display: block;
      margin: 10px;
      padding: 4px;
      text-decoration: none;
      color: inherit;
      // Padding 4px + 4px margin + 24px icon width = 32px
      text-indent: -32px;
      padding-left: 32px;
      // Some filenames are too long for the sidebar. However, unlike with the
      // file manager where we have the full filename visible in multiple places,
      // here we must make sure the filename is fully visible. Hence, we don't
      // use white-space: nowrap, but rather word-break: break-all.
      word-break: break-all;

      svg {
        width: 24px;
        height: 24px;
        margin-right: 4px;
        vertical-align: bottom;
        margin-bottom: -1px;
        // Necessary to give the extension icons the correct colour
        fill: currentColor;
      }
    }

    // Bibliography entries
    div.csl-bib-body {
      div.csl-entry {
        display: list-item;
        list-style-type: square;
        margin: 1em 0.2em 1em 1.8em;
        font-size: 80%;
        user-select: text;
        cursor: text;
      }

      a { color: var(--blue-0); }
    }

    // Table of Contents entries
    div.toc-entry-container {
      // Clever calculation based on the data-level property
      // margin-left: calc(attr(data-level) * 10px);
      display: flex;
      margin-bottom: 10px;
      margin-right: 10px;

      div.toc-level {
        flex-shrink: 1;
        padding: 0px 5px;
        font-weight: bold;
        color: var(--system-accent-color, --c-primary);
      }

      div.toc-entry {
        flex-grow: 3;
        cursor: pointer;
        &:hover { text-decoration: underline; }
      }

      div.toc-entry-active {
        font-weight: bold;
        color: var(--system-accent-color);
      }
    }

    div.related-files-container {
      padding: 10px;

      div.related-file {
        margin-bottom: 10px;
        display: flex;
        align-items: center;

        span.filename {
          display: inline-block;
          font-size: 11px;
          padding: 10px 5px;
          flex-grow: 8;

          &:hover {
            background-color: rgb(200, 200, 200);
          }
        }

        span.icons {
          display: inline-block;
          border-radius: 4px;
          padding: 2px;
          flex-grow: 2;
          flex-shrink: 0;
          text-align: right;
        }
      }
    }

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

        div.overflow-hidden {
          overflow: hidden;
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
          background-color: rgb(180, 180, 180);
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
  }

  &.dark {
    #sidebar {
      background-color: rgba(30, 30, 30, 1);
      color: rgb(230, 230, 230);

      div.related-files-container {
        div.related-file {
          span.filename:hover { background-color: rgb(80, 80, 80); }
        }
      }
    }
  }
}

body.darwin {
  div#sidebar {
    // On macOS the toolbar is 40px high and the documents titlebar is 30px high,
    // so we want to offset the sidebar by that.
    top: calc(40px + 30px);
    background-color: transparent;

    div.related-files-container {
      div.related-file span.filename { border-radius: 4px; }
    }
  }

  &.dark {
    div#sidebar {
      background-color: transparent;
    }
  }
}
</style>
