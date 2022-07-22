const URL_REGEX = /(https?:\/\/)?([\w\-]+\.)+[\w\-]{2,}/gi;
const EXCLUSION_LIST = [
  'tachiyomi.org',
  'github.com',
  'user-images.githubusercontent.com',
  'gist.github.com',
];

export function urlsFromIssueBody(body: string): string[] {
  const urls = Array.from(body.matchAll(URL_REGEX))
    .map((url) => {
      return url[0].replace(/https?:\/\/(www\.)?/g, '').toLowerCase();
    })
    .filter((url) => !EXCLUSION_LIST.includes(url));

  return Array.from(new Set(urls));
}
