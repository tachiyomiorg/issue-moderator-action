const URL_REGEX = /(https?:\/\/)?([\w\-]+\.)+[\w\-]{2,}/gi;
const EXCLUSION_LIST = [
  'tachiyomi.org',
  'github.com',
  'user-images.githubusercontent.com',
  'gist.github.com',
];

export function urlsFromIssueBody(body: string): string[] {
  const urls = Array.from(body.matchAll(URL_REGEX))
    .map((url) => cleanUrl(url[0]))
    .filter((url) => !EXCLUSION_LIST.includes(url));
  return Array.from(new Set(urls));
}

export function cleanUrl(url: string): string {
  return url.replace(/https?:\/\/(www\.)?/g, '').toLowerCase();
}
