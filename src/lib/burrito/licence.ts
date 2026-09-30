export const licenceName = /CC BY-SA 4\.0|Creative Commons Attribution-ShareAlike 4\.0/i;

export const licenceUrl = /creativecommons\.org\/licenses\/by-sa\/4\.0/i;

const licenceFile = /(^|\/)licen[cs]e(\.[a-z]+)?$/i;

const shortName = 'CC BY-SA 4.0';

export function isLicenceFile(key: string): boolean {
  return licenceFile.test(key);
}

export function licenceKeyOf(keys: Iterable<string>): string | undefined {
  return [...keys].find(isLicenceFile);
}

export function displayedLicence(statement: string, text: string | undefined): string {
  if (licenceName.test(statement) || text === undefined || !licenceName.test(text)) {
    return statement;
  }
  return `${statement.trim().replace(/[.,;]+$/, '')}, ${shortName}`;
}
