import * as core from '@actions/core';
import * as github from '@actions/github';
import { GitHub } from '@actions/github/lib/utils';
import { IssueCommentEvent } from '@octokit/webhooks-definitions/schema';

type GitHubClient = InstanceType<typeof GitHub>
type LockReason = 'off-topic' | 'too heated' | 'resolved' | 'spam'
type CommandFn = (client: GitHubClient, commentBody: string) => Promise<void>

const BOT_CHARACTERS = '^[/?!]'
const BOT_REGEX = new RegExp(BOT_CHARACTERS)

const COMMANDS: Record<string, CommandFn> = {
  'edit-title': editIssueTitle,
  'lock': lockIssue,
  'duplicate': duplicateIssue
}

const ALLOWED_ACTIONS = ['created'];

async function run() {
  try {
    const { eventName, repo } = github.context;

    if (eventName !== 'issue_comment') {
      return;
    }

    const payload = github.context.payload as IssueCommentEvent

    // Do nothing if it's wasn't a relevant action or it's not an issue comment.
    if (ALLOWED_ACTIONS.indexOf(payload.action) === -1 || !payload.comment) {
      core.info('Irrelevant action trigger');
      return;
    }
    if (!payload.sender) {
      throw new Error('Internal error, no sender provided by GitHub');
    }

    const {
      body: commentBody,
      id: commentId,
      user: commentUser
    } = payload.comment;

    // Find the command used.
    const commandToRun = Object.keys(COMMANDS)
      .find(key => {
        return commentBody.startsWith(core.getInput(`${key}-command`)) ||
          commentBody.match(new RegExp(BOT_CHARACTERS + key));
      });

    if (commandToRun) {
      core.info(`Command found: ${commandToRun}`);

      const client = github.getOctokit(
        core.getInput('repo-token', {required: true})
      );

      // Get all the members from the organization.
      const allowedMembers = await client.rest.orgs.listMembers({
        org: repo.owner
      });

      if (allowedMembers.status !== 200) {
        core.info('Failed to fetch the members from the organization');
        return;
      }

      if (allowedMembers.data.find(member => member.login === commentUser.login)) {
        const commandFn = COMMANDS[commandToRun];

        await commandFn(client, commentBody);

        // Comments with commands are always minimized and marked as resolved.
        await minimizeComment(client, commentId)
      } else {
        core.info('The comment author is not a organization member');
      }
    } else {
      core.info('No commands found on the comment');
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

async function minimizeComment(client: GitHubClient, commentId: number) {
  // Use the GitHub GraphQL API since the REST API does not
  // provide the minimize/hide comment method.
  await client.graphql(
    `
      mutation MinimizeComment($input: MinimizeCommentInput!) {
        minimizeComment(input: $input) {
          clientMutationId
        }
      }
    `,
    {
      input: {
        classifier: 'RESOLVED',
        subjectId: commentId
      }
    }
  )
}

async function lockIssue(client: GitHubClient) {
  const { issue, payload, repo } = github.context;
  const commentBody: string = payload.comment.body;

  const lockReasons = ['off-topic', 'too heated', 'resolved', 'spam'];

  // Find the first reason present on the comment body text.
  const reason = lockReasons.find(option => commentBody.includes(option));

  await client.rest.issues.lock({
    owner: repo.owner,
    repo: repo.repo,
    issue_number: issue.number,
    // Ternary operator to deal with type issues.
    lock_reason: reason ? reason as LockReason : undefined
  });

  core.info(`Issue #${payload.issue.number} locked`);
}

async function duplicateIssue(client: GitHubClient, commentBody: string) {
  // If the comment was a question, don't execute the command.
  if (!commentBody.match(BOT_REGEX) && commentBody.match(/#\d{3,4}\?/)) {
    core.info('Issue not closed because the comment contains a question');
    return;
  }

  const { issue, repo } = github.context;

  const issueMetadata = {
    owner: issue.owner,
    repo: issue.repo,
    issue_number: issue.number
  };

  const issueData = await client.rest.issues.get(issueMetadata);

  if (issueData.data.state === 'open') {
    await client.rest.issues.update({
      owner: repo.owner,
      repo: repo.repo,
      issue_number: issue.number,
      state: 'closed'
    });

    core.info(`Issue #${issue.number} closed`);
  }
}

async function editIssueTitle(client: GitHubClient) {
  const { issue, payload, repo } = github.context;
  const commentBody: string = payload.comment.body;

  // Get the new title inside a double quotes string style,
  // with support to escaping.
  const newTitleMatch = commentBody.match(/"(?:[^"\\]|\\.)*"/);

  if (!newTitleMatch) {
    core.info('Title not specified');
    return;
  }

  // Remove the surrounding double quotes and
  // parse the escaping characters, so \" will become ".
  // The other escaping characters, such as \n and \t,
  // will be removed from the string.
  const newTitle = newTitleMatch[0]
    .slice(1, -1)
    .replace(/\\"/g, '"')
    .replace(/\\(.)/g, '')

  await client.rest.issues.update({
    owner: repo.owner,
    repo: repo.repo,
    issue_number: issue.number,
    title: newTitle
  });

  core.info(`Title of the issue #${payload.issue.number} edited`);
}

run();
