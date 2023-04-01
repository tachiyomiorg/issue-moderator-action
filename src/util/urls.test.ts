import { describe, expect, it } from 'vitest';

import { cleanUrl, urlsFromIssueBody } from './urls';

describe('urlsFromIssueBody', () => {
  it('extracts URLs', () => {
    ([['foo https://mangadex.org bar', ['mangadex.org']]] as const).forEach(
      ([body, expectedUrls]) => {
        expect(urlsFromIssueBody(body)).toStrictEqual(expectedUrls);
      },
    );
  });

  it('excludes some URLs', () => {
    (
      [
        ['foo https://tachiyomi.org/extensions bar', []],
        ['foo https://github.com/tachiyomiorg bar', []],
        ['foo user-images.githubusercontent.com/something bar', []],
        ['foo www.gist.github.com/something bar', []],
      ] as const
    ).forEach(([body, expectedUrls]) => {
      expect(urlsFromIssueBody(body)).toStrictEqual(expectedUrls);
    });
  });
});

describe('cleanUrl', () => {
  it('sanitizes URLs', () => {
    (
      [
        [
          'https://www.tachiyomi.org/subpath?foo=bar#hash',
          'tachiyomi.org/subpath?foo=bar#hash',
        ],
        ['http://google.com/', 'google.com/'],
        ['https://GITHUB.com', 'github.com'],
      ] as const
    ).forEach(([url, expectedUrl]) => {
      expect(cleanUrl(url)).toStrictEqual(expectedUrl);
    });
  });
});
