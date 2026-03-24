#!/usr/bin/env bash
set -u -o pipefail

# sync_custom_branches.sh
# Usage: run from repo root. Must be on branch "custom" when starting.

current_branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null) || {
  echo "Error: not a git repository or cannot determine current branch." >&2
  exit 1
}

if [ "${current_branch}" != "custom" ]; then
  echo "Error: current branch is '${current_branch}' (expected 'custom'). Aborting." >&2
  exit 1
fi

targets=("custom-dev" "custom-integration")

for target in "${targets[@]}"; do
  echo "\n--- Processing branch: ${target} ---"

  # Checkout target branch
  if ! git checkout "${target}"; then
    echo "Error: failed to checkout branch '${target}'. Aborting." >&2
    exit 1
  fi

  # Merge 'custom' into target
  echo "Merging 'custom' into '${target}'..."
  if ! git merge custom; then
    echo "\nMerge error: conflicts or other merge failure occurred while merging 'custom' into '${target}'." >&2
    echo "Do NOT push. Resolve conflicts manually, commit, then push when ready." >&2
    exit 1
  fi

  # Push the updated target branch
  echo "Pushing '${target}' to origin..."
  if ! git push origin "${target}"; then
    echo "Error: failed to push '${target}'. Aborting." >&2
    exit 1
  fi

  echo "Branch '${target}' updated and pushed successfully."
done

# Return to original 'custom' branch
echo "\nSwitching back to 'custom'..."
git checkout custom || true

echo "All done."
