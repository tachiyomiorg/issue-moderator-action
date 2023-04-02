import { Octokit } from '@octokit/action';
import { beforeAll, describe, expect, test } from 'vitest';

import { baseIssueMetadata, waitForClosedIssue } from './util';

const octokit = new Octokit();

describe('Duplicate check', () => {
  beforeAll(async () => {
    const createdIssue = await octokit.issues.create({
      ...baseIssueMetadata,
      title: '[Test] Issue for duplicate checks',
      body: `This is used for testing the duplicate issue check.

  Please add https://foobar.com/!`,
      labels: ['enhancement', 'do-not-autoclose', 'test'],
    });

    return async () => {
      await octokit.issues.update({
        ...baseIssueMetadata,
        issue_number: createdIssue.data.number,
        state: 'closed',
      });
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
  });
});

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
