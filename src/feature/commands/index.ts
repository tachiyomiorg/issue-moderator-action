import * as core from '@actions/core';
import * as github from '@actions/github';
import { IssueCommentEvent } from '@octokit/webhooks-types/schema';

import { GitHubClient } from '../../types';
import { minimizeComment } from '../../util/comments';

import { handleBlurb } from './blurbs';
import { closeDuplicateIssue } from './close-duplicate-issue';
import { deleteIssue } from './delete-issue';
import { editIssueTitle } from './edit-issue-title';
import { lockIssue } from './lock-issue';

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
  delete: {
    minimizeComment: false,
    fn: deleteIssue,
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

  try {
    const memberToken = core.getInput('member-token');
    const memberClient = memberToken ? github.getOctokit(memberToken) : client;

    await memberClient.rest.orgs.checkMembershipForUser({
      org: repo.owner,
      username: commentUser.login,
    });
  } catch (_) {
    core.info('Could not verify the membership of the comment author');
    return;
  }

  const command = COMMANDS[commandToRun];

  await command.fn(client, commentBody);

  if (command.minimizeComment) {
    await minimizeComment(client, commentNodeId);
  }
}
