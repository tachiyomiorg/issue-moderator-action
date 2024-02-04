import { Octokit } from '@octokit/action';

import { GitHubClient } from '../src/types';

export const baseIssueMetadata = {
  owner: 'tachiyomiorg',
  repo: 'issue-moderator-action',
};

async function waitFor(seconds: number) {
  await new Promise((r) => setTimeout(r, seconds));
}

export async function waitForClosedIssue(
  octokit: Octokit,
  issueNumber: number,
) {
  console.log(`Checking issue #${issueNumber}`);
  let issue: Awaited<ReturnType<typeof octokit.issues.get>> | undefined;
  while (issue?.data?.state !== 'closed') {
    await waitFor(5_000);

    issue = await octokit.issues.get({
      ...baseIssueMetadata,
      issue_number: issueNumber,
    });
  }
  return issue;
}

export async function deleteIssue(client: GitHubClient, issueId: string) {
  try {
    await client.graphql(
      `
        mutation {
          deleteIssue(input: {issueId: $issueId, clientMutationId: "Delete test issue"}) {
            clientMutationId
          }
        }
      `,
      {
        issueId,
      },
    );
  } catch (error: any) {
    console.log(`Failed to delete issue: ${error.message}`);
  }
}
