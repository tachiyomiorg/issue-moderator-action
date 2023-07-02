import * as core from '@actions/core';
import * as github from '@actions/github';

import { GitHubClient } from '../../types';

export interface Blurb {
  keywords: string[];
  message: string;
}

export async function handleBlurb(client: GitHubClient, commentBody: string) {
  const { issue, repo } = github.context;

  const blurbs: string = core.getInput('blurbs');
  if (!blurbs) {
    core.info('SKIP: no blurbs set');
    return;
  }

  const parsedBlurbs = JSON.parse(blurbs) as Blurb[];
  const matchedBlurb: Blurb | undefined = parsedBlurbs.find((blurb) => {
    return blurb.keywords.find((keyword) => commentBody.includes(keyword));
  });

  if (!matchedBlurb) {
    core.info('No blurb found');
    return;
  }

  const issueMetadata = {
    owner: issue.owner,
    repo: issue.repo,
    issue_number: issue.number,
  };

  const issueData = await client.rest.issues.get(issueMetadata);

  if (issueData.data.state === 'open') {
    await client.rest.issues.createComment({
      ...issueMetadata,
      body: matchedBlurb.message,
    });

    await client.rest.issues.update({
      owner: repo.owner,
      repo: repo.repo,
      issue_number: issue.number,
      state: 'closed',
      state_reason: 'not_planned',
    });

    core.info(`Closed issue #${issue.number}`);
  }
}
