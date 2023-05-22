# GitHub action to moderate issues

This action allows the usage of some commands from the organization
to moderate the issues of a repository. It can also search for duplicate
URLs in the opened issues and close the new opened issue if needed.

---

## Installation

To configure the action simply add the following lines to your workflow file:

```yml
name: Moderator
on:
  issues:
    types:
      # If you want the duplicate URL checker and/or the auto-closer
      - opened
      # If you want the auto-closer to run
      - edited
      - reopened
  issue_comment:
    types:
      - created
jobs:
  moderate:
    runs-on: ubuntu-latest
    steps:
      - name: Moderate issues
        uses: tachiyomiorg/issue-moderator-action@v2
        with:
          repo-token: ${{ secrets.GITHUB_TOKEN }}
```

---

## Inputs

### Base

| Name              | Description                                                |
| ----------------- | ---------------------------------------------------------- |
| `repo-token`      | GitHub access token                                        |
| `duplicate-label` | Label to add on duplicate command and auto duplicate check |

### Auto closers

| Name                      | Description                                                                                     |
| ------------------------- | ----------------------------------------------------------------------------------------------- |
| `duplicate-check-enabled` | Enable the duplicate URL finder if sets to `true`.                                              |
| `duplicate-check-labels`  | Labels of the opened issues to check.                                                           |
| `duplicate-check-comment` | Comment body when the issue was detected to be a duplicate.                                     |
| `existing-check-enabled`  | Enable the existing source check if sets to `true`.                                             |
| `existing-check-labels`   | Labels of the opened issues to do the check.                                                    |
| `existing-check-repo-url` | URL of the JSON extension repository.                                                           |
| `existing-check-comment`  | Comment body when the issue was detected to be of an existing source.                           |
| `auto-close-rules`        | A JSON-compliant string containing a list of rules, where a rule consists of the content below. |
| `auto-close-ignore-label` | Optional label name. If present, auto-close, duplicate-check, and existing-check are skipped.   |

### Commands

| Name                 | Description                             | Default value   |
| -------------------- | --------------------------------------- | --------------- |
| `duplicate-command`  | Optional duplicate command text.        | Duplicate of #  |
| `edit-title-command` | Optional edit issue title command text. | Edit title to   |
| `lock-command`       | Optional lock command text.             | Lock this issue |

---

## Auto closer

### Duplicate URLs check

The action can also check for opened issues with a given label for
duplicate URLs. It's useful if you have a system to request websites
to be added to your repository through issues.

To enable it, you need to set `duplicate-check-enabled` to `true`
and define the label that the action should check with `duplicate-check-label`.

### Regex rules

Automatically close issues whose title or body text matches the specified regular expression pattern.

Rules are re-evaluated on issue edits and automatically reopens the issue if the rules pass.

#### Rule definition

```js
{
  type: 'title' | 'body' | 'both';
  regex: string;
  closeifMatch: boolean | undefined;
  message: string;
  ignoreCase: boolean | undefined;
  labels: string[] | undefined;
}
```

- `type`: Part to run regex against.
- `regex`: String compiled to a JavaScript `RegExp`. If matched, the issue is closed.
- `closeIfMatch`: Close the issue if `regex` is matched. Defaults to `true`, so an issue is closed if the regex is matched. If `false`, an issue is closed if the regex is not matched, i.e. enforcing presence of something.
- `message`: ES2015-style template literal evaluated with the issue webhook payload in context (see [payload example](https://developer.github.com/v3/activity/events/types/#webhook-payload-example-15)). Posted when the issue is closed. You can use `{match}` as a placeholder to the first match.
- `ignoreCase`: Optionally make the regex case insensitive. Defaults to `false`.
- `labels`: Optional labels to add when closing the issue.

Example:

```yml
auto-close-rules: |
  [
    {
      "type": "title",
      "regex": ".*Placeholder title.*",
      "message": "@${issue.user.login} this issue was automatically closed because it did not follow the issue template"
    }
  ]
```

---

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
