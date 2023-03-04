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
import { SearchResult, SearchResultWrapper } from '@dts/common/search'
import { OutboundLink } from '@dts/renderer/misc'
import { defineComponent } from '@vue/runtime-core'
import { markText } from '../shared'
import { copyZknLink } from '@common/util/clipboard'

const path = window.path
const ipcRenderer = window.ipc

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
      toggleStateOutbound: false
    }
  },
  computed: {
    backlinks: function (): SearchResultWrapper[] {
      return this.$store.state.backlinks
    },
    unlinkedMentions: function (): SearchResultWrapper[] {
      return this.$store.state.unlinkedMentions
    },
    outboundLinks: function (): OutboundLink[] {
      return this.$store.state.outboundLinks
    },
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
    }
  },
  methods: {
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
      // The value we are subtracting is the amount of lines we want to
      // show above the target line
      // TODO merge
      const lineToScroll = Math.max(
        lineNumber - this.$store.state.config['custom.test.val1'],
        0
      )
      // TODO merge: lineToFlash
      this.jumpToLine(filePath, lineNumber, isMiddleClick)
    },
    // **** Adapted from GlobalSearch.vue ****
    jumpToLine: function (filePath: string, lineNumber: number, openInNewTab: boolean = false) {
      // TODO merge: lineToFlash
      this.$emit('jtl', filePath, lineNumber, openInNewTab)
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
</style>
