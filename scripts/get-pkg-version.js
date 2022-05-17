// This script file simply outputs the version in the package.json.
// It is used as a helper by the continuous integration
const path = require('path')

const ver = require(path.join(__dirname, '../package.json')).version

console.log(ver)
