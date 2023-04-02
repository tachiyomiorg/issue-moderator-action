import * as core from '@actions/core';

export async function shouldIgnore(issueData: any): Promise<boolean> {
  const ignoreLabel: string = core.getInput('auto-close-ignore-label');
  if (ignoreLabel) {
    core.info(`Ignoring issue with label ${ignoreLabel}`);
    return !!issueData.data.labels.find(
      (label: any) => label.name === ignoreLabel,
    );
  }

  return false;
}
