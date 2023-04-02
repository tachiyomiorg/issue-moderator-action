import { Octokit } from '@octokit/action';
import { describe, expect, test } from 'vitest';

import { baseIssueMetadata, waitForClosedIssue } from './util';

const octokit = new Octokit();

describe('Existing source check', () => {
  test('Issue created for an existing source gets automatically closed', async () => {
    const createdIssue = await octokit.issues.create({
      ...baseIssueMetadata,
      title: '[Test] This should be closed since the source already exists',
      body: 'Please add https://mangadex.org/!',
      labels: ['enhancement', 'test'],
    });

    const issue = await waitForClosedIssue(octokit, createdIssue.data.number);

    expect(issue.data.state).toStrictEqual('closed');
    expect(issue.data.state_reason).toStrictEqual('not_planned');
  });
});
