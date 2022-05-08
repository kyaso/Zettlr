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

export default function (): any {
  return {
    fieldsets: [
      [
        // Favorite files

        {
          type: 'file',
          label: 'Ctrl + 1',
          model: 'custom.ctrlNum.file1',
          reset: '',
          filter: {
            'md': 'Markdown'
          }
        },
        {
          type: 'file',
          label: 'Ctrl + 2',
          model: 'custom.ctrlNum.file2',
          reset: '',
          filter: {
            'md': 'Markdown'
          }
        },
        {
          type: 'file',
          label: 'Ctrl + 3',
          model: 'custom.ctrlNum.file3',
          reset: '',
          filter: {
            'md': 'Markdown'
          }
        },
        {
          type: 'file',
          label: 'Ctrl + 4',
          model: 'custom.ctrlNum.file4',
          reset: '',
          filter: {
            'md': 'Markdown'
          }
        },
        {
          type: 'file',
          label: 'Ctrl + 5',
          model: 'custom.ctrlNum.file5',
          reset: '',
          filter: {
            'md': 'Markdown'
          }
        },
        {
          type: 'file',
          label: 'Ctrl + 6',
          model: 'custom.ctrlNum.file6',
          reset: '',
          filter: {
            'md': 'Markdown'
          }
        },
        {
          type: 'file',
          label: 'Ctrl + 7',
          model: 'custom.ctrlNum.file7',
          reset: '',
          filter: {
            'md': 'Markdown'
          }
        },
        {
          type: 'file',
          label: 'Ctrl + 8',
          model: 'custom.ctrlNum.file8',
          reset: '',
          filter: {
            'md': 'Markdown'
          }
        },
        {
          type: 'file',
          label: 'Ctrl + 9',
          model: 'custom.ctrlNum.file9',
          reset: '',
          filter: {
            'md': 'Markdown'
          }
        }
      ],

      [
        // How the mouse forward/back buttons should behave
        {
          type: 'checkbox',
          label: 'Mouse forward/back buttons should switch between current and last file',
          model: 'custom.mousePrevBack',
          reset: false
        }
      ],

      // Custom values for testing
      [
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
    ]
  }
}
