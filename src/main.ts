import * as core from '@actions/core';
import * as github from '@actions/github';

import { checkForAutoClose } from './feature/auto-closer';
import { checkForCommand } from './feature/commands';
import { checkForDuplicateUrls } from './feature/duplicate-url-check';
import { checkForExistingSource } from './feature/existing-source-check';

async function withLogGroup(name: string, fn: () => Promise<void>) {
  core.startGroup(name);
  await fn();
  core.endGroup();
}

async function run() {
  try {
    const { eventName, payload } = github.context;

    if (!payload.sender) {
      throw new Error('Internal error, no sender provided by GitHub');
    }

    if (eventName === 'issues') {
      if (!payload.action || !payload.issue) {
        core.info('Irrelevant action trigger');
        return;
      }

      await withLogGroup('Auto closer', checkForAutoClose);
      await withLogGroup('Existing source checker', checkForExistingSource);
      await withLogGroup('Duplicate URL checker', checkForDuplicateUrls);
      return;
    }

    if (eventName === 'issue_comment') {
      if (!payload.action || !payload.comment) {
        core.info('Irrelevant action trigger');
        return;
      }

      await withLogGroup('Command', checkForCommand);
      return;
    }
  } catch (error: any) {
    core.setFailed(error.message);
  }
}

run();
