import * as core from '@actions/core';
import * as github from '@actions/github';

import { GitHubClient } from '../../types';

export async function editIssueTitle(client: GitHubClient) {
  const { issue, payload, repo } = github.context;
  const commentBody: string = payload.comment?.body ?? '';

  // Get the new title inside a double quotes string style,
  // with support to escaping.
  const newTitleMatch = commentBody.match(/"(?:[^"\\]|\\.)*"/);

  if (!newTitleMatch) {
    core.info('Title not specified');
    return;
  }

  // Remove the surrounding double quotes and
  // parse the escaping characters, so \" will become ".
  // The other escaping characters, such as \n and \t,
  // will be removed from the string.
  const newTitle = newTitleMatch[0]
    .slice(1, -1)
    .replace(/\\"/g, '"')
    .replace(/\\(.)/g, '');

  await client.rest.issues.update({
    owner: repo.owner,
    repo: repo.repo,
    issue_number: issue.number,
    title: newTitle,
  });

  core.info(`Edited title of issue #${payload.issue!.number}`);
}
