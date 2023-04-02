import * as core from '@actions/core';
import * as github from '@actions/github';

import { checkForAutoClose } from './feature/auto-closer';
import { checkForCommand } from './feature/commands';
import { checkForExisting } from './feature/existing-check';
import { checkForDuplicates } from './feature/dupe-check';

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
      await withLogGroup('Auto closer', checkForAutoClose);
      await withLogGroup('Existing source checker', checkForExisting);
      await withLogGroup('Duplicate URL checker', checkForDuplicates);
      return;
    }

    if (eventName === 'issue_comment') {
      await withLogGroup('Command', checkForCommand);
      return;
    }
  } catch (error: any) {
    core.setFailed(error.message);
  }
}

run();
