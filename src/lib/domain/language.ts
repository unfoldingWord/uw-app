const languageTag = /^[a-z]{2,3}(-[A-Za-z0-9]{1,8})*$/;

export function isLanguageTag(value: string): boolean {
  return languageTag.test(value);
}
