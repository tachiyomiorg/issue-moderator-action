import * as core from '@actions/core';
import * as github from '@actions/github';

import { GitHubClient } from '../../types';
import { addDuplicateLabel } from '../../util/issues';

import { BOT_REGEX } from '.';

export async function closeDuplicateIssue(
  client: GitHubClient,
  commentBody: string,
) {
  // If the comment was a question, don't execute the command.
  if (!commentBody.match(BOT_REGEX) && commentBody.match(/#\d{3,4}\?/)) {
    core.info('Issue not closed because the comment contains a question');
    return;
  }

  const { issue, repo } = github.context;

  const issueMetadata = {
    owner: issue.owner,
    repo: issue.repo,
    issue_number: issue.number,
  };

  const issueData = await client.rest.issues.get(issueMetadata);

  if (issueData.data.state === 'open') {
    await addDuplicateLabel(client, issueMetadata);
    await client.rest.issues.update({
      owner: repo.owner,
      repo: repo.repo,
      issue_number: issue.number,
      state: 'closed',
      state_reason: 'not_planned',
    });

    core.info(`Closed issue #${issue.number}`);
  }
}
