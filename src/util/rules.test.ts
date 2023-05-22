import { describe, expect, it } from 'vitest';

import { evaluateRules } from './rules';

describe('evaluateRules', () => {
  it('returns failed rules and labels', () => {
    const [failed, labels] = evaluateRules(
      [
        {
          type: 'both',
          regex: '.*default message.*',
          ignoreCase: true,
          message: 'Contains default message',
          labels: ['failed'],
        },
      ],
      'Title with default message',
      'Body with DEFAULT message',
    );

    expect(failed).toStrictEqual(['Contains default message']);
    expect(labels).toStrictEqual(['failed']);
  });

  it('returns failed rules and labels when closeIfMatch is false', () => {
    const [failed, labels] = evaluateRules(
      [
        {
          type: 'title',
          regex: '.*default message.*',
          closeIfMatch: false,
          ignoreCase: true,
          message: 'Does not contains template',
          labels: ['failed'],
        },
      ],
      'Modified title',
      'Body',
    );

    expect(failed).toStrictEqual(['Does not contains template']);
    expect(labels).toStrictEqual(['failed']);
  });
});
