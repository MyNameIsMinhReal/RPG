# Run this from the repository root in PowerShell to push changes to GitHub for the first time.
# It will set the remote to the URL you provided and push the current branch as 'main'.

$remoteUrl = 'https://github.com/MyNameIsMinhReal/RPG.git'

Write-Host "Configuring remote: $remoteUrl"

# Init repo if necessary
$inside = & git rev-parse --is-inside-work-tree 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Host 'Not a git repo yet — running git init'
  git init
}

# Ensure origin remote points to the provided URL
$existing = & git remote get-url origin 2>$null
if ($LASTEXITCODE -ne 0) {
  git remote add origin $remoteUrl
  Write-Host 'Added origin remote.'
} else {
  git remote set-url origin $remoteUrl
  Write-Host 'Updated origin remote URL.'
}

# Ensure branch name is 'main'
git branch -M main

# Stage & commit
git add .
$commitMsg = 'feat: inventory UI, post-event buttons, craft command'
$commitResult = & git commit -m "$commitMsg" 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Host 'No new commit created (there may be no changes to commit).'
} else {
  Write-Host $commitResult
}

# Push and set upstream
Write-Host 'Pushing to origin main (you may be prompted to authenticate)...'
git push -u origin main

Write-Host 'Done.'
