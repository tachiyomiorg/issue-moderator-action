import * as core from '@actions/core';
import * as github from '@actions/github';
import { IssuesEvent } from '@octokit/webhooks-definitions/schema';

import { addLabels, shouldIgnore } from '../util/issues';

interface Rule {
  type: 'title' | 'body' | 'both';
  regex: string;
  ignoreCase?: boolean;
  message: string;
  labels?: string[];
}

const ALLOWED_ACTIONS = ['opened', 'edited', 'reopened'];

/**
 * Check if the issue should be automatically closed based on defined rules.
 */
export async function checkForAutoClose() {
  try {
    const payload = github.context.payload as IssuesEvent;
    if (!ALLOWED_ACTIONS.includes(payload.action)) {
      return;
    }

    const rules: string = core.getInput('auto-close-rules');
    if (!rules) {
      core.info('SKIP: no auto-close rules set');
      return;
    }

    const client = github.getOctokit(
      core.getInput('repo-token', { required: true }),
    );

    const { issue } = github.context;
    const issueMetadata = {
      owner: issue.owner,
      repo: issue.repo,
      issue_number: issue.number,
    };

    const issueData = await client.rest.issues.get(issueMetadata);

    if (await shouldIgnore(issueData.data.labels?.map((l: any) => l.name))) {
      return;
    }

    const parsedRules = JSON.parse(rules) as Rule[];
    let labels: string[] = [];
    const results = parsedRules
      .map((rule) => {
        let texts: string[] = [payload?.issue?.title];

        if (rule.type === 'body') {
          texts = [payload?.issue?.body ?? ''];
        } else if (rule.type === 'both') {
          texts.push(payload?.issue?.body ?? '');
        }

        const regexMatches = check(rule.regex, texts, rule.ignoreCase);
        const failed = regexMatches.length > 0;
        const match = failed ? regexMatches[0][1] : '<No match>';
        const message = rule.message.replace(/\{match\}/g, match);

        if (failed) {
          labels = labels.concat(rule.labels ?? []);
          core.info(`Failed: ${message}`);
          return message;
        } else {
          core.info(`Passed: ${message}`);
        }
      })
      .filter(Boolean);

    if (results.length > 0) {
      // Comment and close if failed any rule
      const infoMessage =
        payload.action === 'opened' ? 'automatically closed' : 'not reopened';

      // Avoid commenting about automatic closure if it was already closed
      const shouldComment =
        (payload.action === 'opened' && issueData.data.state === 'open') ||
        (payload.action === 'edited' && issueData.data.state === 'closed');

      if (shouldComment) {
        const message = [
          `@\${issue.user.login} this issue was ${infoMessage} because:\n`,
          ...results,
        ].join('\n- ');

        await client.rest.issues.createComment({
          ...issueMetadata,
          body: evalTemplate(message, payload),
        });
      }

      await addLabels(client, issueMetadata, labels);

      await client.rest.issues.update({
        ...issueMetadata,
        state: 'closed',
        state_reason: 'not_planned',
      });
    }
  } catch (error: any) {
    core.setFailed(error.message);
  }
}

/**
 * Checks all the texts in an array through an RegEx pattern
 * and returns the match results of the ones that matched.
 *
 * @param patternString The RegEx input in string format that will be created.
 * @param texts The text array that will be tested through the pattern.
 * @param ignoreCase If it should be case insensitive.
 * @returns An array of the RegEx match results.
 */
function check(
  patternString: string,
  texts: string[] | undefined,
  ignoreCase: boolean = false,
): RegExpMatchArray[] {
  const pattern = new RegExp(patternString, ignoreCase ? 'i' : undefined);
  return texts
    ?.map((text) => {
      // For all the texts (title or body), the input will be
      // normalized to remove any accents or diacritics, and then
      // will be tested by the pattern provided.
      return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .match(pattern);
    })
    ?.filter(Boolean) as RegExpMatchArray[];
}

function evalTemplate(template: string, params: any) {
  return Function(
    ...Object.keys(params),
    `return \`${template}\``,
  )(...Object.values(params));
}
