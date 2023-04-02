import * as core from '@actions/core';
import { GitHubClient } from '../types';

interface IssueParameters {
  owner: string;
  repo: string;
  issue_number: number;
}

export async function shouldIgnore(
  labels: string[] | undefined,
): Promise<boolean> {
  if (!labels) {
    core.info('SKIP: issue has no labels');
    return true;
  }

  const ignoreLabel: string = core.getInput('auto-close-ignore-label');
  if (ignoreLabel) {
    core.info(`SKIP: ignoring issue with label ${ignoreLabel}`);
    return !!labels.find((label: string) => label === ignoreLabel);
  }

  return false;
}

export async function addDuplicateLabel(
  client: GitHubClient,
  params: IssueParameters,
) {
  const label = core.getInput('duplicate-label');
  if (!label) {
    return;
  }
  await addLabels(client, params, [label]);
}

export async function addLabels(
  client: GitHubClient,
  params: IssueParameters,
  labels: string[],
) {
  if (labels.length == 0) {
    return;
  }
  await client.rest.issues.addLabels({
    ...params,
    labels,
  });
  core.info(`Added labels: ${labels}`);
}
