import * as core from '@actions/core';

import { GitHubClient } from '../types';

/**
 * Minimize comment and mark it as resolved.
 */
export async function minimizeComment(
  client: GitHubClient,
  commentNodeId: string,
) {
  // Use the GitHub GraphQL API since the REST API does not
  // provide the minimize/hide comment method.
  try {
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
      },
    );
  } catch (error: any) {
    core.warning(`Failed to minimize comment: ${error.message}`);
  }
}
