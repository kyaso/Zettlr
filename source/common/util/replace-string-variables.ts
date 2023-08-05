/**
 * BEGIN HEADER
 *
 * Contains:        Utility function
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains a utility function to replace certain variables.
 *
 * END HEADER
 */

import { v4 as uuid4 } from 'uuid'
import { DateTime } from 'luxon'

/**
 * A utility function that can replace a bunch of variables in strings, used
 * for the pattern generators (ID and filename)
 * @param       {string} string The input string
 * @return      {string}        The output string, with all %-variables replaced
 */
export default function replaceStringVariables (string: string, now?: DateTime): string {
  // Get the current date
  if (now === undefined) {
    now = DateTime.now() // .setLocale('en-GB')
  }

  // Now generate the id by replacing all placeholders in the pattern
  return string
    .replace(/%Y/g, now.toFormat('y'))
    .replace(/%y/g, now.toFormat('yy'))
    .replace(/%M/g, now.toFormat('LL'))
    .replace(/%D/g, now.toFormat('dd'))
    .replace(/%W/g, now.toFormat('WW'))
    .replace(/%h/g, now.toFormat('HH'))
    .replace(/%m/g, now.toFormat('mm'))
    .replace(/%s/g, now.toFormat('ss'))
    .replace(/%X/g, now.toFormat('X'))
    .replace(/%uuid4/g, uuid4())
    .replace(/%base62/g, getBase62ID(6))
}

function getBase62ID (len: number): string {
  let result = ''
  // const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const charactersLength = characters.length

  for (let i = 0; i < len; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength))
  }

  return result
}
