import * as core from '@actions/core';
import * as github from '@actions/github';

import { GitHubClient } from '../../types';
import { deleteIssue as deleteIssueUtil } from '../../util/issues';

import { BOT_REGEX } from '.';

export async function deleteIssue(client: GitHubClient, commentBody: string) {
  // If the comment was a question, don't execute the command.
  if (!commentBody.match(BOT_REGEX) && commentBody.match(/#\d{3,4}\?/)) {
    core.info('Issue not closed because the comment contains a question');
    return;
  }

  const { issue } = github.context;

  const issueMetadata = {
    owner: issue.owner,
    repo: issue.repo,
    issue_number: issue.number,
  };
  const issueData = await client.rest.issues.get(issueMetadata);

  await deleteIssueUtil(client, issueData.data.node_id);
}
