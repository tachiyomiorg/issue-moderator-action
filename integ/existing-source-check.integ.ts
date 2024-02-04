import { Octokit } from '@octokit/action';
import { describe, expect, test } from 'vitest';

import { baseIssueMetadata, waitForClosedIssue } from './util';
import { deleteIssue } from '../src/util/issues';

const octokit = new Octokit();

describe('Existing source check', () => {
  // TODO: there isn't much to test against now...
  test.skip('Issue created for an existing source gets automatically closed', async () => {
    const createdIssue = await octokit.issues.create({
      ...baseIssueMetadata,
      title: '[Test] This should be closed since the source already exists',
      body: 'Please add http://127.0.0.1:3000!',
      labels: ['enhancement', 'test'],
    });

    const issue = await waitForClosedIssue(octokit, createdIssue.data.number);

    expect(issue.data.state).toStrictEqual('closed');
    expect(issue.data.state_reason).toStrictEqual('not_planned');

    await deleteIssue(octokit, issue.data.node_id);
  });
});
