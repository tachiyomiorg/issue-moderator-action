import * as core from '@actions/core';
import * as github from '@actions/github';
import { IssueCommentEvent } from '@octokit/webhooks-types/schema';

import { GitHubClient } from '../../types';
import { minimizeComment } from '../../util/comments';

import { closeDuplicateIssue } from './close-duplicate-issue';
import { editIssueTitle } from './edit-issue-title';
import { lockIssue } from './lock-issue';
import { handleBlurb } from './blurbs';

type CommandFn = (client: GitHubClient, commentBody: string) => Promise<void>;
interface Command {
  minimizeComment: boolean;
  fn: CommandFn;
}

const BOT_CHARACTERS = '^[/?!]';
export const BOT_REGEX = new RegExp(BOT_CHARACTERS);

const COMMANDS: Record<string, Command> = {
  blurb: {
    minimizeComment: true,
    fn: handleBlurb,
  },
  duplicate: {
    minimizeComment: false,
    fn: closeDuplicateIssue,
  },
  'edit-title': {
    minimizeComment: true,
    fn: editIssueTitle,
  },
  lock: {
    minimizeComment: true,
    fn: lockIssue,
  },
};

/**
 * Check if the comment has a valid command and execute it.
 */
export async function checkForCommand() {
  const payload = github.context.payload as IssueCommentEvent;
  if (!['created'].includes(payload.action)) {
    core.info('Irrelevant action trigger');
    return;
  }

  const { repo } = github.context;
  const {
    body: commentBody,
    node_id: commentNodeId,
    user: commentUser,
  } = payload.comment;

  // Find the command used.
  const commandToRun = Object.keys(COMMANDS).find((key) => {
    return (
      commentBody.startsWith(core.getInput(`${key}-command`)) ||
      commentBody.match(new RegExp(BOT_CHARACTERS + key))
    );
  });

  if (!commandToRun) {
    core.info('No commands found');
    return;
  }

  core.info(`Command found: ${commandToRun}`);

  const client = github.getOctokit(
    core.getInput('repo-token', { required: true }),
  );

  // Get all the members from the organization.
  const allowedMembers = await client.rest.orgs.listMembers({
    org: repo.owner,
  });
  if (allowedMembers.status !== 200) {
    core.info('Failed to fetch the members from the organization');
    return;
  }
  if (
    !allowedMembers.data.find((member) => member.login === commentUser.login)
  ) {
    core.info('The comment author is not a organization member');
    return;
  }

  const command = COMMANDS[commandToRun];

  await command.fn(client, commentBody);

  if (command.minimizeComment) {
    await minimizeComment(client, commentNodeId);
  }
}
