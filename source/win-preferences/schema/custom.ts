/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Custom preferences
 * CVM-Role:        Model
 * Maintainer:      Kirthihan Yasotharan
 * License:         GNU GPL v3
 *
 * Description:     Exports the Custom tab schema.
 *
 * END HEADER
 */

import { type PreferencesFieldset } from '../App.vue'
import { PreferencesGroups } from './_preferences-groups'

export function getCustomFields (): PreferencesFieldset[] {
  return [
    {
      title: 'Search',
      group: PreferencesGroups.Custom,
      help: undefined,
      fields: [
        {
          type: 'number',
          label: 'Maximum number of files to search in parallel',
          inline: true,
          min: 1,
          model: 'custom.maxConcurrentSearches',
          reset: 8
        }
      ]
    },
    {
      title: 'Test values',
      group: PreferencesGroups.Custom,
      help: undefined,
      fields: [
        {
          type: 'number',
          label: 'custom.test.val1',
          model: 'custom.test.val1',
          reset: 0
        },
        {
          type: 'number',
          label: 'custom.test.val2',
          model: 'custom.test.val2',
          reset: 0
        },
        {
          type: 'number',
          label: 'custom.test.val3',
          model: 'custom.test.val3',
          reset: 0
        },
        {
          type: 'number',
          label: 'custom.test.val4',
          model: 'custom.test.val4',
          reset: 0
        },
        {
          type: 'number',
          label: 'custom.test.val5',
          model: 'custom.test.val5',
          reset: 0
        }
      ]
    }
  ]
}
