const URL_REGEX = /(?:https?:\/\/)?(?:[-\w]+\.)+[a-z]{2,18}\/?/gi;
const EXCLUSION_LIST = [
  'tachiyomi.org',
  'github.com',
  'user-images.githubusercontent.com',
  'gist.github.com',
];
// Also file name extensions
const EXCLUDED_DOMAINS = ['.md'];

export function urlsFromIssueBody(body: string): string[] {
  const urls = Array.from(body.matchAll(URL_REGEX))
    .map((url) => cleanUrl(url[0]))
    .filter((url) => !EXCLUSION_LIST.includes(url))
    .filter((url) => EXCLUDED_DOMAINS.every((domain) => !url.endsWith(domain)));
  return Array.from(new Set(urls));
}

export function cleanUrl(url: string): string {
  return url
    .toLowerCase()
    .replace(/(https?:\/\/)?(www\.)?/g, '')
    .replace(/\/$/, '');
}
