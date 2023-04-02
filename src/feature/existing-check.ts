import * as core from '@actions/core';
import * as github from '@actions/github';
import { Issue } from '@octokit/webhooks-definitions/schema';
import axios from 'axios';

import { shouldIgnore } from '../util/issues';
import { cleanUrl, urlsFromIssueBody } from '../util/urls';

const ALLOWED_ISSUES_ACTIONS = ['opened'];

interface Extension {
  name: string;
  lang: string;
  sources: Source[];
}

interface Source {
  baseUrl: string;
}

// Check if the source request issue is from an existing extension.
export async function checkForExisting() {
  const existingCheckEnabled = core.getInput('existing-check-enabled');
  if (existingCheckEnabled !== 'true') {
    core.info('SKIP: the existing source check is disabled');
    return;
  }

  const payload = github.context.payload;

  if (
    !payload.action ||
    !payload.issue ||
    !ALLOWED_ISSUES_ACTIONS.includes(payload.action)
  ) {
    core.info('Irrelevant action trigger');
    return;
  }

  const issue = payload.issue as Issue;

  if (await shouldIgnore(issue.labels?.map((l) => l.name))) {
    return;
  }

  const labelsToCheckInput = core.getInput('existing-check-labels', {
    required: true,
  });
  const labelsToCheck: string[] = JSON.parse(labelsToCheckInput);
  const hasRelevantLabel = issue.labels?.some((label) =>
    labelsToCheck.includes(label.name),
  );
  if (!hasRelevantLabel) {
    core.info('SKIP: no existing check label set');
    return;
  }

  const issueUrls = urlsFromIssueBody(issue.body);
  if (issueUrls.length === 0) {
    core.info('No URLs found in the issue body');
    return;
  }

  const repoJsonUrl = core.getInput('existing-check-repo-url', {
    required: true,
  });

  let repository: Extension[] = [];
  try {
    core.debug(`Fetching ${repoJsonUrl}`);
    const { data } = await axios.get<Extension[]>(repoJsonUrl);
    repository = data;
  } catch (_) {
    core.error('Failed to fetch the repository JSON, aborting.');
    return;
  }

  const requestUrl = cleanUrl(issueUrls[0]);
  const existingExtension = repository.find((extension) =>
    extension.sources.find((source) => cleanUrl(source.baseUrl) === requestUrl),
  );
  if (!existingExtension) {
    core.info(`Existing extension with the URL "${requestUrl}" was not found.`);
    return;
  }

  const client = github.getOctokit(
    core.getInput('repo-token', { required: true }),
  );

  const { repo } = github.context;

  const issueMetadata = {
    owner: repo.owner,
    repo: repo.repo,
    issue_number: issue.number,
  };

  const extensionName = existingExtension.name.replace('Tachiyomi: ', '');
  const extensionLang = findLangName(existingExtension.lang);

  await client.rest.issues.update({
    ...issueMetadata,
    state: 'closed',
    state_reason: 'not_planned',
  });

  await client.rest.issues.createComment({
    ...issueMetadata,
    body: core
      .getInput('existing-check-comment')
      .replace(/\{extensionName\}/g, extensionName)
      .replace(/\{extensionLang\}/g, extensionLang),
  });
}

function findLangName(langCode: string): string {
  const exceptions: Record<string, string> = {
    all: 'All',
    other: 'Other',
  };

  if (exceptions[langCode]) {
    return exceptions[langCode];
  }

  const displayNames = new Intl.DisplayNames(['en'], { type: 'language' });
  return displayNames.of(langCode)!;
}
