<template>
  <div role="tabpanel">
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
            <clr-icon
              v-if="result.weight / maxWeight < 0.3"
              shape="dot-circle"
              style="fill: #aaaaaa"
            ></clr-icon>
            <clr-icon
              v-else-if="result.weight / maxWeight < 0.7"
              shape="dot-circle"
              style="fill: #2975d9"
            ></clr-icon>
            <clr-icon
              v-else
              shape="dot-circle"
              style="fill: #33aa33"
            ></clr-icon>
            {{ result.file.displayName }}
          </div>

          <div class="collapse-icon">
            <clr-icon
              v-bind:shape="result.hideResultSet ? 'caret left' : 'caret down'"
            ></clr-icon>
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
              onResultClick($event, idx, idx2, result.file.path, singleRes.line)
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

    <hr />

    <h1
      class="backlinks-title"
      v-on:click="hideUnlinkedMentions = !hideUnlinkedMentions"
    >
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
            <clr-icon
              v-if="result.weight / maxWeight < 0.3"
              shape="dot-circle"
              style="fill: #aaaaaa"
            ></clr-icon>
            <clr-icon
              v-else-if="result.weight / maxWeight < 0.7"
              shape="dot-circle"
              style="fill: #2975d9"
            ></clr-icon>
            <clr-icon
              v-else
              shape="dot-circle"
              style="fill: #33aa33"
            ></clr-icon>
            {{ result.file.displayName }}
          </div>

          <div class="collapse-icon">
            <clr-icon
              v-bind:shape="result.hideResultSet ? 'caret left' : 'caret down'"
            ></clr-icon>
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
              onResultClick($event, idx, idx2, result.file.path, singleRes.line)
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
import { defineComponent } from '@vue/runtime-core'
import { markText } from '../shared'

const path = window.path

export default defineComponent({
  name: 'BacklinksTab',
  components: {
    ButtonControl
  },
  emits: ['jtl'],
  data () {
    return {
      hideBacklinks: true,
      hideUnlinkedMentions: true,
      maxWeight: 0,
      toggleState: false
    }
  },
  computed: {
    backlinks: function (): SearchResultWrapper[] {
      return this.$store.state.backlinks
    },
    unlinkedMentions: function (): SearchResultWrapper[] {
      return this.$store.state.unlinkedMentions
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
    }
  },
  methods: {
    // **** Adapted from GlobalSearch.vue ****
    toggleResults (type: string): void {
      if (type === 'backlinks') {
        this.toggleState = !this.toggleState
        for (const b of this.backlinks) {
          b.hideResultSet = this.toggleState
        }
      } else if (type === 'unlinked') {
        this.toggleState = !this.toggleState
        for (const u of this.unlinkedMentions) {
          u.hideResultSet = this.toggleState
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
      const lineToScroll = Math.max(
        lineNumber - this.$store.state.config['custom.test.val1'],
        0
      )
      // TODO merge: lineToFlash
      this.jumpToLine(filePath, lineToScroll, isMiddleClick)
    },
    // **** Adapted from GlobalSearch.vue ****
    jumpToLine: function (filePath: string, lineNumber: number, openInNewTab: boolean = false) {
      // TODO merge: lineToFlash
      this.$emit('jtl', filePath, lineNumber, openInNewTab)
    },
    // **** Copied from GlobalSearch.vue ****
    markText: function (resultObject: SearchResult) {
      return markText(resultObject)
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
</style>
