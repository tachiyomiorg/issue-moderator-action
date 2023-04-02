import * as core from '@actions/core';
import * as github from '@actions/github';

import { GitHubClient } from '../../types';

type LockReason = 'off-topic' | 'too heated' | 'resolved' | 'spam';

export async function lockIssue(client: GitHubClient) {
  const { issue, payload, repo } = github.context;
  const commentBody: string = payload.comment?.body ?? '';

  const lockReasons = ['off-topic', 'too heated', 'resolved', 'spam'];

  // Find the first reason present on the comment body text.
  const reason = lockReasons.find((option) => commentBody.includes(option));

  await client.rest.issues.lock({
    owner: repo.owner,
    repo: repo.repo,
    issue_number: issue.number,
    // Ternary operator to deal with type issues.
    lock_reason: reason ? (reason as LockReason) : undefined,
  });

  core.info(`Locked issue #${payload.issue!.number}`);
}
