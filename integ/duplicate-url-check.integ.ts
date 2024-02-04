import { Octokit } from '@octokit/action';
import { beforeAll, describe, expect, test } from 'vitest';

import { baseIssueMetadata, deleteIssue, waitForClosedIssue } from './util';

const octokit = new Octokit();

describe('Duplicate URL check', () => {
  beforeAll(async () => {
    const createdIssue = await octokit.issues.create({
      ...baseIssueMetadata,
      title: '[Test] Issue for duplicate checks',
      body: `This is used for testing the duplicate issue check.

  Please add https://foobar.com/!`,
      labels: ['enhancement', 'do-not-autoclose', 'test'],
    });
    console.log(`Created baseline issue #${createdIssue.data.number}`);

    return async () => {
      await octokit.issues.update({
        ...baseIssueMetadata,
        issue_number: createdIssue.data.number,
        state: 'closed',
      });

      await deleteIssue(octokit, createdIssue.data.node_id);
    };
  });

  test('Issue opened with duplicate URL gets automatically closed', async () => {
    const createdIssue = await octokit.issues.create({
      ...baseIssueMetadata,
      title: '[Test] This should be closed as a duplicate of an open issue',
      body: 'Please add https://foobar.com/!',
      labels: ['enhancement', 'test'],
    });

    const issue = await waitForClosedIssue(octokit, createdIssue.data.number);

    expect(issue.data.state).toStrictEqual('closed');
    expect(issue.data.state_reason).toStrictEqual('not_planned');
    expect(issue.data.labels.map((l: any) => l.name)).toContain('duplicate');

    await deleteIssue(octokit, issue.data.node_id);
  });
});
