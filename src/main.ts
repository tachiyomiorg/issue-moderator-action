import * as core from '@actions/core';
import * as github from '@actions/github';
import { GitHub } from '@actions/github/lib/utils';
import { Issue, IssueCommentEvent, IssuesOpenedEvent } from '@octokit/webhooks-definitions/schema';
import dedent from 'dedent'

type GitHubClient = InstanceType<typeof GitHub>;
type LockReason = 'off-topic' | 'too heated' | 'resolved' | 'spam';
type CommandFn = (client: GitHubClient, commentBody: string) => Promise<void>;
interface Command {
  minimizeComment: boolean;
  fn: CommandFn;
}

const BOT_CHARACTERS = '^[/?!]';
const BOT_REGEX = new RegExp(BOT_CHARACTERS);

const COMMANDS: Record<string, Command> = {
  'edit-title': {
    minimizeComment: true,
    fn: editIssueTitle,
  },
  'lock': {
    minimizeComment: true,
    fn: lockIssue,
  },
  'duplicate': {
    minimizeComment: false,
    fn: duplicateIssue,
  },
};

const ALLOWED_COMMENT_ACTIONS = ['created'];
const ALLOWED_ISSUES_ACTIONS = ['opened'];

const URL_REGEX = /(https?:\/\/)?([\w\-]+\.)+[\w\-]{2,}/gi;
const URL_FILE_REGEX = /\.(png|jpg|jpeg|gif)$/i
const EXCLUSION_LIST = [
  'tachiyomi.org',
  'github.com',
  'user-images.githubusercontent.com',
  'gist.github.com'
];

async function run() {
  try {
    const { eventName } = github.context;

    if (eventName === 'issues') {
      await checkForDuplicates();
      return;
    }

    if (eventName === 'issue_comment') {
      await checkForCommand();
      return;
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

// Check if the source request issue is a duplicate.
async function checkForDuplicates() {
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

  if (!payload.sender) {
    throw new Error('Internal error, no sender provided by GitHub');
  }

  const issue = payload.issue as Issue;
  const labelToCheck = core.getInput('duplicate-check-label', {required: true});
  const hasTheLabel = issue.labels?.find(label => label.name === labelToCheck);

  if (!hasTheLabel) {
    core.info('The issue does not have the label defined');
    return;
  }

  const issueUrls = urlsFromIssueBody(issue.body)

  if (issueUrls.length === 0) {
    core.info('No URLs found in the issue body');
    return;
  }

  const client = github.getOctokit(
    core.getInput('repo-token', {required: true})
  );

  const { repo } = github.context;

  const allOpenIssues = await client.paginate(client.rest.issues.listForRepo, {
    owner: repo.owner,
    repo: repo.repo,
    state: 'open',
    labels: labelToCheck,
    per_page: 100
  });

  const duplicateIssues = allOpenIssues
    .map(issue => ({ 
      number: issue.number, 
      urls: urlsFromIssueBody(issue.body)
    }))
    .filter(currIssue => {
      return currIssue.number !== issue.number &&
        currIssue.urls.some(url => issueUrls.includes(url));
    })
    .map(issue => '#' + issue.number);

  if (duplicateIssues.length === 0) {
    core.info('No duplicate issues were found');
    return;
  }

  const issueMetadata = {
    owner: repo.owner,
    repo: repo.repo,
    issue_number: issue.number
  };

  const duplicateIssuesText = duplicateIssues.join(', ')
    .replace(/, ([^,]*)$/, ' and $1');

  await client.rest.issues.createComment({
    ...issueMetadata,
    body: dedent`
      This issue was closed because it is a duplicate of ${duplicateIssuesText}.

      *This is an automated action. If you think this is a mistake, please
      comment about it so the issue can be manually reopened if needed.*
    `
  });

  await client.rest.issues.update({
    ...issueMetadata,
    state: 'closed'
  });
}

function urlsFromIssueBody(body: string): string[] {
  const urls = Array.from(body.matchAll(URL_REGEX))
    .map(url => {
      return url[0]
        .replace('www.', '')
        .replace(/\/.*$/, '')
        .replace(/\)$/, '')
        .toLowerCase();
    })
    .filter(url => {
      return !EXCLUSION_LIST.includes(url) && !url.match(URL_FILE_REGEX)
    });

  return Array.from(new Set(urls));
}

// Check if the comment has a valid command and execute it.
async function checkForCommand() {
  const { repo } = github.context;
  const payload = github.context.payload as IssueCommentEvent;

  // Do nothing if it's wasn't a relevant action or it's not an issue comment.
  if (!ALLOWED_COMMENT_ACTIONS.includes(payload.action) || !payload.comment) {
    core.info('Irrelevant action trigger');
    return;
  }
  if (!payload.sender) {
    throw new Error('Internal error, no sender provided by GitHub');
  }

  const {
    body: commentBody,
    node_id: commentNodeId,
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
      const command = COMMANDS[commandToRun];

      await command.fn(client, commentBody);

      if (command.minimizeComment) {
        await minimizeComment(client, commentNodeId);
      }
    } else {
      core.info('The comment author is not a organization member');
    }
  } else {
    core.info('No commands found');
  }
}

// Minimize comment and marked as resolved
async function minimizeComment(client: GitHubClient, commentNodeId: string) {
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
        subjectId: commentNodeId,
      },
    }
  );
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
    issue_number: issue.number,
  };

  const issueData = await client.rest.issues.get(issueMetadata);

  if (issueData.data.state === 'open') {
    await client.rest.issues.update({
      owner: repo.owner,
      repo: repo.repo,
      issue_number: issue.number,
      state: 'closed',
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
    .replace(/\\(.)/g, '');

  await client.rest.issues.update({
    owner: repo.owner,
    repo: repo.repo,
    issue_number: issue.number,
    title: newTitle,
  });

  core.info(`Title of the issue #${payload.issue.number} edited`);
}

run();
