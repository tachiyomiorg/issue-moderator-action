import * as core from '@actions/core';

export interface Rule {
  type: 'title' | 'body' | 'both';
  regex: string;
  ignoreCase?: boolean;
  message: string;
  labels?: string[];
}

export function evaluateRules(
  rules: Rule[],
  title: string,
  body: string,
): [string[], string[]] {
  let labels: string[] = [];
  const failed = rules
    .map((rule) => {
      let texts: string[] = [title];
      if (rule.type === 'body') {
        texts = [body];
      } else if (rule.type === 'both') {
        texts.push(body);
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
    .filter(Boolean) as string[];

  return [failed, labels];
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
