const languageTag = /^[a-z]{2,3}(-[A-Za-z0-9]{1,16}){0,6}$/;

export function isLanguageTag(value: string): boolean {
  return languageTag.test(value);
}
