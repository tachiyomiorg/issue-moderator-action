import * as core from '@actions/core';
import * as github from '@actions/github';

import { checkForAutoClose } from './feature/auto-closer';
import { checkForCommand } from './feature/commands';
import { checkForExisting } from './feature/existing-check';
import { checkForDuplicates } from './feature/dupe-check';

async function run() {
  try {
    const { eventName, payload } = github.context;

    if (!payload.sender) {
      throw new Error('Internal error, no sender provided by GitHub');
    }

    if (eventName === 'issues') {
      await checkForAutoClose();
      await checkForExisting();
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

run();
