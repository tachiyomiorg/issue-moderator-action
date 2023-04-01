import { describe, expect, it } from 'vitest';

import { cleanUrl, urlsFromIssueBody } from './urls';

describe('urlsFromIssueBody', () => {
  it('extracts URLs', () => {
    (
      [
        ['foo https://mangadex.org bar', ['mangadex.org']],
        [
          `### Source information and language

    Sunshine Butterfly Scans 1.4.29 (English)

    ### Source new URL

    wings.sbs

    ### Other details

    I have searched for previous issues about the matter of Sunshine Butterfly's changed domain. I checked the version of the last issue raised, and it is quite old. I saw that the current extension has been updated, but the domain remains unchanged.

    ### Acknowledgements

    - [X] I have searched the existing issues and this is a new ticket, **NOT** a duplicate or related to another open or closed issue.
    - [X] I have written a short but informative title.
    - [X] I have updated all installed extensions.
    - [X] I have checked if the source URL is not already updated by opening WebView.
    - [X] I will fill out all of the requested information in this form.`,
          ['wings.sbs'],
        ],
      ] as const
    ).forEach(([body, expectedUrls]) => {
      expect(urlsFromIssueBody(body)).toStrictEqual(expectedUrls);
    });
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
