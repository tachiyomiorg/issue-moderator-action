import * as core from '@actions/core';
import * as github from '@actions/github';
import { Issue, IssuesOpenedEvent } from '@octokit/webhooks-definitions/schema';

import { urlsFromIssueBody } from '../utils';

const ALLOWED_ISSUES_ACTIONS = ['opened'];

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

  let labelsToCheck = [];
  let labelsToCheckInput = core.getInput('duplicate-check-labels');
  if (labelsToCheckInput) {
    labelsToCheck = JSON.parse(labelsToCheckInput);
  } else {
    labelsToCheck = [core.getInput('duplicate-check-label')];
  }

  const hasRelevantLabel = issue.labels?.some((label) =>
    labelsToCheck.includes(label.name),
  );
  if (!hasRelevantLabel) {
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

  const results = await Promise.all(
    labelsToCheck.map((label) =>
      client.paginate(client.rest.issues.listForRepo, {
        owner: repo.owner,
        repo: repo.repo,
        state: 'open',
        labels: label,
        per_page: 100,
      }),
    ),
  );
  const allOpenIssues = results.flat();

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

  await client.rest.issues.update({
    ...issueMetadata,
    state: 'closed',
    state_reason: 'not_planned',
  });

  await client.rest.issues.createComment({
    ...issueMetadata,
    body: core
      .getInput('duplicate-check-comment')
      .replace(/\{duplicateIssuesText\}/g, duplicateIssuesText),
  });
}
