import * as core from '@actions/core';
import * as github from '@actions/github';
import { Issue, IssuesEvent } from '@octokit/webhooks-definitions/schema';

import { addDuplicateLabel, shouldIgnore } from '../util/issues';
import { urlsFromIssueBody } from '../util/urls';

const ALLOWED_ISSUES_ACTIONS = ['opened'];

/**
 * Check if other open issues have the same URL(s).
 */
export async function checkForDuplicateUrls() {
  const payload = github.context.payload as IssuesEvent;
  if (!ALLOWED_ISSUES_ACTIONS.includes(payload.action)) {
    core.info('Irrelevant action trigger');
    return;
  }

  const duplicateCheckEnabled = core.getInput('duplicate-check-enabled');
  if (duplicateCheckEnabled !== 'true') {
    core.info('SKIP: the duplicate URL check is disabled');
    return;
  }

  const issue = payload.issue as Issue;

  if (await shouldIgnore(issue.labels?.map((l) => l.name))) {
    return;
  }

  const labelsToCheckInput = core.getInput('duplicate-check-labels', {
    required: true,
  });
  const labelsToCheck: string[] = JSON.parse(labelsToCheckInput);
  const hasRelevantLabel = issue.labels?.some((label) =>
    labelsToCheck.includes(label.name),
  );
  if (!hasRelevantLabel) {
    core.info('SKIP: no duplicate check label set');
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
      urls: urlsFromIssueBody(currIssue.body ?? ''),
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

  await addDuplicateLabel(client, issueMetadata);
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
