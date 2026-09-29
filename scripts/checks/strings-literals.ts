import ts from 'typescript';

export type LiteralFinding = { file: string; line: number; text: string };

export type ScanRules = { prose: boolean };

const copyProps: ReadonlySet<string> = new Set([
  'accessibilityLabel',
  'accessibilityHint',
  'aria-label',
  'alt',
  'caption',
  'hint',
  'label',
  'message',
  'overline',
  'placeholder',
  'subtitle',
  'text',
  'title',
]);

const letter = /\p{L}/u;
const prose = /\p{L}[\s.,;:?!]+\p{L}/u;

function literalText(node: ts.Node): string | undefined {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  if (ts.isTemplateExpression(node)) {
    return [node.head.text, ...node.templateSpans.map((span) => span.literal.text)].join(' ');
  }
  return undefined;
}

function literalsIn(expression: ts.Expression | undefined): ts.Node[] {
  if (expression === undefined) {
    return [];
  }
  if (ts.isParenthesizedExpression(expression)) {
    return literalsIn(expression.expression);
  }
  if (ts.isConditionalExpression(expression)) {
    return [...literalsIn(expression.whenTrue), ...literalsIn(expression.whenFalse)];
  }
  if (ts.isBinaryExpression(expression)) {
    return [...literalsIn(expression.left), ...literalsIn(expression.right)];
  }
  return literalText(expression) === undefined ? [] : [expression];
}

function isModuleOrType(node: ts.Node): boolean {
  const parent = node.parent as ts.Node | undefined;
  if (parent === undefined) {
    return true;
  }
  return (
    ts.isImportDeclaration(parent) ||
    ts.isExportDeclaration(parent) ||
    ts.isLiteralTypeNode(parent) ||
    ts.isExternalModuleReference(parent) ||
    (ts.isCallExpression(parent) && parent.expression.kind === ts.SyntaxKind.ImportKeyword)
  );
}

function copyPropName(attribute: ts.JsxAttribute): string | undefined {
  const name = attribute.name;
  const text = ts.isIdentifier(name) ? name.text : `${name.namespace.text}:${name.name.text}`;
  return copyProps.has(text) ? text : undefined;
}

export function scanSource(file: string, source: string, rules: ScanRules): LiteralFinding[] {
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const flagged = new Set<ts.Node>();
  const findings: LiteralFinding[] = [];

  function flag(node: ts.Node, text: string): void {
    if (flagged.has(node) || !letter.test(text)) {
      return;
    }
    flagged.add(node);
    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    findings.push({ file, line: line + 1, text: text.trim().replace(/\s+/gu, ' ') });
  }

  function visit(node: ts.Node): void {
    if (ts.isJsxText(node)) {
      flag(node, node.text);
    } else if (ts.isJsxExpression(node) && (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent))) {
      for (const literal of literalsIn(node.expression)) {
        flag(literal, literalText(literal) ?? '');
      }
    } else if (ts.isJsxAttribute(node) && copyPropName(node) !== undefined) {
      const initializer = node.initializer;
      const literals =
        initializer === undefined
          ? []
          : ts.isJsxExpression(initializer)
            ? literalsIn(initializer.expression)
            : [initializer];
      for (const literal of literals) {
        flag(literal, literalText(literal) ?? '');
      }
    } else if (rules.prose && !isModuleOrType(node)) {
      const text = literalText(node);
      if (text !== undefined && prose.test(text)) {
        flag(node, text);
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return findings;
}
