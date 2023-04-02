export async function waitFor(seconds: number) {
  await new Promise((r) => setTimeout(r, seconds));
}
