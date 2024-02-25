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

import { PreferencesGroups, type PreferencesFieldset } from '../App.vue'

export function getCustomFields (): PreferencesFieldset[] {
  return [
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
