import * as core from '@actions/core';

export async function shouldIgnore(
  labels: string[] | undefined,
): Promise<boolean> {
  if (!labels) {
    core.info('SKIP: issue has no labels');
    return true;
  }

  const ignoreLabel: string = core.getInput('auto-close-ignore-label');
  if (ignoreLabel) {
    core.info(`SKIP: ignoring issue with label ${ignoreLabel}`);
    return !!labels.find((label: string) => label === ignoreLabel);
  }

  return false;
}
