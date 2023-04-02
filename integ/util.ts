import { Octokit } from '@octokit/action';

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
