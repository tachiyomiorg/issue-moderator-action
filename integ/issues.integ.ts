import { Octokit } from '@octokit/action';
import { afterAll, beforeAll, expect, test } from 'vitest';

import { waitFor } from './util';

const octokit = new Octokit();

const owner = 'tachiyomiorg';
const repo = 'issue-moderator-action';

let baseDuplicateIssueNumber;

beforeAll(async () => {
  const createdIssue = await octokit.issues.create({
    owner,
    repo,
    title: '[Test] Issue for duplicate checks',
    body: `This is used for testing the duplicate issue check.

Please add https://foobar.com/!`,
    labels: ['enhancement', 'do-not-autoclose', 'test'],
  });

  baseDuplicateIssueNumber = createdIssue.data.number;
});

afterAll(async () => {
  await octokit.issues.update({
    owner,
    repo,
    issue_number: baseDuplicateIssueNumber,
    state: 'closed',
  });
});

test('Issue opened with duplicate URL gets automatically closed', async () => {
  const createdIssue = await octokit.issues.create({
    owner,
    repo,
    title: '[Test] This should be closed as a duplicate',
    body: 'Please add https://foobar.com/!',
    labels: ['enhancement', 'test'],
  });

  let issue: Awaited<ReturnType<typeof octokit.issues.get>> | undefined;
  while (issue?.data?.state !== 'closed') {
    await waitFor(5_000);

    issue = await octokit.issues.get({
      owner,
      repo,
      issue_number: createdIssue.data.number,
    });
  }

  expect(issue.data.state).toStrictEqual('closed');
  expect(issue.data.state_reason).toStrictEqual('not_planned');
});
