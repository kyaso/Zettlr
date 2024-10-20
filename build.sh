#!/usr/bin/bash

# Make sure the script exits whenever a command fails
set -e

FORCE=false
INSTALL=true
PUSH=false

# Show help function
showHelp() {
    echo "Usage: ./build.sh [-h] [-f] [-p]"
    echo ""
    echo "Options:"
    echo "-h: Show this help and exit."
    echo "-f: Force rebuild."
    echo "-p: Push after build."
    exit 0
}

# Parse args
while getopts "fph" opt
do
    case $opt in
        f) FORCE=true;;
        p) PUSH=true;;
        h) showHelp;;
        *) showHelp;;
    esac
done

# The branch we should be in
BRANCH="custom"

# Get current branch
CUR_BRANCH=`git branch --show-current`

# If wrong branch, abort
if [ $CUR_BRANCH != $BRANCH ]; then
    echo "Wrong branch '${CUR_BRANCH}'."
    echo "Expected branch: ${BRANCH}"
    exit 0
fi

# Get most recent tag
CURRENT_VER=`git describe --tags --abbrev=0`

# Get version from package.json
NEW_VER=`grep "version" package.json | tr -d ' ",'`
NEW_VER='v'${NEW_VER:8}

# If versions equal, abort
if [[ ($FORCE == false)  &&  ($NEW_VER == $CURRENT_VER) ]]; then
    echo "No new version found."
    echo "Did you forget to update the version in package.json?"
    echo "Use the -f option to force build."
    exit 0
fi

######################
# BUILD STARTS HERE
######################

# Run yarn package
echo "**** Running yarn package..."
yarn package:linux-x64

# Run yarn release
echo "**** Running yarn release..."
yarn release:linux-x64

# Rename binary
OLD_NAME="Zettlr*"
COMMIT_SHA=`git rev-parse --short HEAD`
NEW_NAME="Zettlr-${NEW_VER:1}_$COMMIT_SHA.AppImage"
echo "**** Renaming output binary..."
mv release/$OLD_NAME release/$NEW_NAME

# Tag new version
echo "**** Adding git tag..."
git tag -f $NEW_VER

# Install
if [ $INSTALL == true ]; then
    INSTALL_DIR=/home/kyaso/Applications
    echo "**** Installing $NEW_NAME to $INSTALL_DIR..."
    mv release/Zettlr* $INSTALL_DIR
    ln -sf $INSTALL_DIR/$NEW_NAME $INSTALL_DIR/zettlr
fi

# Push
if [ $PUSH == true ]; then
    echo "**** Pushing..."
    ./push.sh
fi