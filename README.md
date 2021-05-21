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
      uses: tachiyomiorg/issue-moderator-action
      with:
        repo-token: ${{ secrets.GITHUB_TOKEN }}
```

## Inputs

| Name | Description | Default value |
| ---- | ----------- | ------------- |
| `repo-token` | GitHub token |  |
| `lock-command` | Optional lock command text. | Lock this issue |
| `duplicate-command` | Optional duplicate command text. | Duplicate of # |
