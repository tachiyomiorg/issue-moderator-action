# GitHub action to moderate issues

This action allows the usage of some commands from the organization
to moderate the issues of a repository. It can also search for duplicate
URLs in the opened issues and close the new opened issue if needed.

## Installation

To configure the action simply add the following lines to your workflow file:

```yml
name: Moderator
on:
  # Add the issues if you want the duplicate URLs check.
  issues:
    types: [opened]
  issue_comment:
    types: [created]
jobs:
  moderate:
    runs-on: ubuntu-latest
    steps:
    - name: Moderate issues
      uses: tachiyomiorg/issue-moderator-action@v1.2
      with:
        repo-token: ${{ secrets.GITHUB_TOKEN }}
```

## Inputs

| Name | Description | Default value |
| ---- | ----------- | ------------- |
| `repo-token` | GitHub token |  |
| `duplicate-command` | Optional duplicate command text. | Duplicate of # |
| `edit-title-command` | Optional edit issue title command text. | Edit title to |
| `lock-command` | Optional lock command text. | Lock this issue |
| `duplicate-check-enabled` | Enable the duplicate URL finder if sets to `true`. |  |
| `duplicate-check-label` | Label of the opened issues to check. |  |

## Commands

All commands can be used in more bot-like way, that supports `?`, `!`
and `/` as the invocation character, and alternatively with a more
human readable way, with sentences that can be customized.

The comment with the command will be minimized and marked as resolved.

### Duplicate

This command will close the current issue as an duplicate.

Usage:

- **Bot-like**: `?duplicate #<issue-number>`
- **Sentence**: `Duplicate of #<issue-number>`

If the sentence way is used and the comment contains a question mark
after the issue number, the command will not be executed as a way to
preventing the current issue from being closed if the person that
commented are in doubt if the current issue is indeed a duplicate.

### Edit issue title

This command will edit the title of the current issue. The new title
must be surrounded by double quotes, and it supports escaping by using `\"`.

Usage:

- **Bot-like**: `?edit-title "<new-title>"`
- **Sentence**: `Edit title to "<new-title>"`

### Lock the issue

This command will lock the current issue.

Usage:

- **Bot-like**: `?lock`
- **Sentence**: `Lock this issue`

Alternatively, the lock reason can be specified.

Usage:

- **Bot-like**: `?lock <off-topic|too heated|resolved|spam>`
- **Sentence**: `Lock this issue as <off-topic|too heated|resolved|spam>`

## Duplicate URLs check

The action can also check for opened issues with a given label for
duplicate URLs. It's useful if you have a system to request websites
to be added to your repository through issues.

To enable it, you need to set `duplicate-check-enabled` to `true`
and define the label that the action should check with `duplicate-check-label`.
