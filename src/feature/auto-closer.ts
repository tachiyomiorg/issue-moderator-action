import * as core from '@actions/core';
import * as github from '@actions/github';
import { IssuesEvent } from '@octokit/webhooks-definitions/schema';

import { addLabels, shouldIgnore } from '../util/issues';
import { evaluateRules, Rule } from '../util/rules';

/**
 * Check if the issue should be automatically closed based on defined rules.
 */
export async function checkForAutoClose() {
  try {
    const payload = github.context.payload as IssuesEvent;
    if (!['opened', 'edited', 'reopened'].includes(payload.action)) {
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
    const [failed, labels] = evaluateRules(
      parsedRules,
      payload?.issue?.title ?? '',
      payload?.issue?.body ?? '',
    );

    if (failed.length > 0) {
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
          ...failed,
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

function evalTemplate(template: string, params: any) {
  return Function(
    ...Object.keys(params),
    `return \`${template}\``,
  )(...Object.values(params));
}
