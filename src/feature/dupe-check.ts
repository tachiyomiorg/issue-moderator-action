import * as core from '@actions/core';
import * as github from '@actions/github';
import { Issue, IssuesOpenedEvent } from '@octokit/webhooks-definitions/schema';
import dedent from 'dedent';

const ALLOWED_ISSUES_ACTIONS = ['opened'];

const URL_REGEX = /(https?:\/\/)?([\w\-]+\.)+[\w\-]{2,}/gi;
const EXCLUSION_LIST = [
  'tachiyomi.org',
  'github.com',
  'user-images.githubusercontent.com',
  'gist.github.com',
];

// Check if the source request issue is a duplicate.
export async function checkForDuplicates() {
  const duplicateCheckEnabled = core.getInput('duplicate-check-enabled');

  if (duplicateCheckEnabled !== 'true') {
    core.info('The duplicate check is disabled');
    return;
  }

  const payload = github.context.payload as IssuesOpenedEvent;

  if (!ALLOWED_ISSUES_ACTIONS.includes(payload.action) || !payload.issue) {
    core.info('Irrelevant action trigger');
    return;
  }

  const issue = payload.issue as Issue;
  const labelToCheck = core.getInput('duplicate-check-label', {
    required: true,
  });
  const hasTheLabel = issue.labels?.find(
    (label) => label.name === labelToCheck,
  );

  if (!hasTheLabel) {
    core.info('No duplicate check label set, skipping');
    return;
  }

  const issueUrls = urlsFromIssueBody(issue.body);

  if (issueUrls.length === 0) {
    core.info('No URLs found in the issue body');
    return;
  }

  const client = github.getOctokit(
    core.getInput('repo-token', { required: true }),
  );

  const { repo } = github.context;

  const allOpenIssues = await client.paginate(client.rest.issues.listForRepo, {
    owner: repo.owner,
    repo: repo.repo,
    state: 'open',
    labels: labelToCheck,
    per_page: 100,
  });

  const duplicateIssues = allOpenIssues
    .map((currIssue) => ({
      number: currIssue.number,
      urls: urlsFromIssueBody(currIssue.body),
    }))
    .filter((currIssue) => {
      return (
        currIssue.number !== issue.number &&
        issueUrls.some((url) => currIssue.urls.includes(url))
      );
    })
    .map((currIssue) => '#' + currIssue.number);

  if (duplicateIssues.length === 0) {
    core.info('No duplicate issues were found');
    return;
  }

  const issueMetadata = {
    owner: repo.owner,
    repo: repo.repo,
    issue_number: issue.number,
  };

  const duplicateIssuesText = duplicateIssues
    .join(', ')
    .replace(/, ([^,]*)$/, ' and $1');

  await client.rest.issues.createComment({
    ...issueMetadata,
    body: dedent`
      This issue was closed because it is a duplicate of ${duplicateIssuesText}.

      *This is an automated action. If you think this is a mistake, please comment about it so the issue can be manually reopened if needed.*
    `,
  });

  await client.rest.issues.update({
    ...issueMetadata,
    state: 'closed',
  });
}

function urlsFromIssueBody(body: string): string[] {
  const urls = Array.from(body.matchAll(URL_REGEX))
    .map((url) => {
      return url[0].replace(/https?:\/\/(www\.)?/g, '').toLowerCase();
    })
    .filter((url) => !EXCLUSION_LIST.includes(url));

  return Array.from(new Set(urls));
}
