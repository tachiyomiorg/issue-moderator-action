import * as core from '@actions/core';
import * as github from '@actions/github';

import { checkForCommand } from './feature/commands';
import { checkForDuplicates } from './feature/dupe-check';

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

run();
