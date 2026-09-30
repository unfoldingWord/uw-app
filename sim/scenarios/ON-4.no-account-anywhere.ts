import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { hostOf } from '@lib/network';
import { preferenceKeys } from '@lib/domain/preferences';
import { imagePackId } from '@lib/domain/pack';
import { scenario } from '../scenario';
import { localTime, servicesOf } from '../services';

const repository = join(import.meta.dirname, '..', '..');

const credentialValues: Readonly<Record<string, RegExp>> = {
  textContentType:
    /^(username|password|newPassword|oneTimeCode|emailAddress|telephoneNumber|creditCardNumber|nickname|name|givenName|familyName)$/,
  autoComplete:
    /^(email|password|username|tel|current-password|new-password|one-time-code|sms-otp|cc-number)/,
  keyboardType: /^(email-address|phone-pad)$/,
  importantForAutofill: /^yes$/,
};

type Field = { file: string; element: string; attribute: string; value: string };

function sourcesUnder(directory: string): string[] {
  return readdirSync(join(repository, directory), { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.tsx'))
    .map((entry) => join(entry.parentPath, entry.name));
}

function attributeValue(initializer: ts.JsxAttributeValue | undefined): string {
  if (initializer === undefined) {
    return 'true';
  }
  if (ts.isStringLiteral(initializer)) {
    return initializer.text;
  }
  if (ts.isJsxExpression(initializer) && initializer.expression !== undefined) {
    const expression = initializer.expression;
    return ts.isStringLiteralLike(expression) ? expression.text : expression.getText();
  }
  return '';
}

function inputFields(file: string): Field[] {
  const source = ts.createSourceFile(
    file,
    readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const found: Field[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const element = node.tagName.getText(source);
      for (const property of node.attributes.properties) {
        if (ts.isJsxAttribute(property)) {
          found.push({
            file,
            element,
            attribute: property.name.getText(source),
            value: attributeValue(property.initializer),
          });
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

const accountWords = /account|sign.?in|log.?in|password|email|e-mail|phone.?number|credential|token|auth/i;

export default scenario(
  'ON-4',
  'no account, sign-in, email or phone number is asked for or sent anywhere, and no request carries credentials',
  async (world) => {
    const phone = world.device('phone', { locale: { tag: 'en-US', region: 'US' } });
    await phone.start();
    const services = servicesOf(phone);
    await services.onboarding.refresh();
    assert.ok((await (await services.onboarding.choose('qaa', { name: 'Jesse' })).done).ok);
    assert.ok((await services.languages.downloadImages()).ok);
    await services.study.open();
    await services.home.refreshStories();
    services.home.invitation(localTime(phone).at);

    const surfaces = Object.entries(services).flatMap(([feature, service]) =>
      Object.keys(service).map((name) => `${feature}.${name}`),
    );
    assert.deepEqual(
      surfaces.filter((name) => accountWords.test(name)),
      [],
      'no feature offers an account, a sign-in or a contact field',
    );
    assert.deepEqual(
      preferenceKeys.filter((key) => accountWords.test(key)),
      [],
      'no preference holds an account, an email or a phone number',
    );
    assert.deepEqual(
      (await phone.adapters.kv.keys()).filter((key) => accountWords.test(key)),
      [],
    );

    const sent = phone.adapters.http.sent();
    assert.ok(sent.length > 0);
    assert.deepEqual(
      [...new Set(sent.map((request) => hostOf(request.url)))].sort(),
      ['cdn.door43.org', 'git.door43.org', 'unfoldingword.org'],
      'the only hosts are the catalog, its downloads, the story pictures and unfoldingWord',
    );
    assert.deepEqual(
      sent.filter(
        (request) =>
          Object.keys(request.headers).some((header) => /authorization|cookie|token|api-key/i.test(header)) ||
          accountWords.test(new URL(request.url).search),
      ),
      [],
      'no request carries a credential',
    );
    assert.ok(phone.kernel.packs.installed().some((pack) => pack.pack === imagePackId));

    const fields = [...sourcesUnder('src'), ...sourcesUnder('app')].flatMap(inputFields);
    const inputs = fields.filter((field) => /(^|\.)(GlassInput|TextInput)$/.test(field.element));
    assert.ok(
      new Set(inputs.map((field) => field.file)).size >= 2,
      'the check reads the text fields the screens render',
    );
    assert.deepEqual(
      fields.filter(
        (field) =>
          field.attribute === 'secureTextEntry' ||
          (credentialValues[field.attribute]?.test(field.value) ?? false),
      ),
      [],
      'no text field asks the system for a credential, an email or a phone number',
    );
  },
);
