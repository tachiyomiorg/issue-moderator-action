# GitHub action to moderate issues

This action allows the usage of some commands from the organization
to moderate the issues of a repository.

## Installation

To configure the action simply add the following lines to your workflow file:

```yml
name: Moderator
on:
  issue_comment:
    types: [created]
jobs:
  moderate:
    runs-on: ubuntu-latest
    steps:
    - name: Moderate issues
      uses: tachiyomiorg/issue-moderator-action@v1.0
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