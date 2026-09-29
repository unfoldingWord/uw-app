import type { Rule } from 'eslint';
import { dirname, relative, resolve, sep } from 'node:path';
import { unitOf } from './units.ts';

type SourceNode = { type: string; value?: unknown; range?: [number, number] };

export const relativeImportsStayInUnit: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'A relative import never leaves its unit, so every cross-unit import is an alias the boundary rules can see.',
    },
    messages: {
      leavesUnit:
        "'{{specifier}}' leaves {{unit}}. Import across units by alias (@lib, @features, @shared, @platform, @sim) so the boundaries in AGENTS.md rule 2 apply.",
    },
    schema: [],
  },
  create(context) {
    const unit = unitOf(context.cwd, context.filename);
    if (unit === undefined) {
      return {};
    }
    const unitRoot = resolve(context.cwd, ...unit.split('/'));
    const directory = dirname(context.filename);

    function check(node: Rule.Node, source: SourceNode | null | undefined): void {
      if (!source || source.type !== 'Literal' || typeof source.value !== 'string') {
        return;
      }
      const specifier = source.value;
      if (!specifier.startsWith('.')) {
        return;
      }
      const target = resolve(directory, specifier);
      const fromRoot = relative(unitRoot, target);
      if (fromRoot === '..' || fromRoot.startsWith(`..${sep}`)) {
        context.report({ node, messageId: 'leavesUnit', data: { specifier, unit } });
      }
    }

    return {
      ImportDeclaration(node) {
        check(node, node.source);
      },
      ExportNamedDeclaration(node) {
        check(node, node.source);
      },
      ExportAllDeclaration(node) {
        check(node, node.source);
      },
      ImportExpression(node) {
        check(node, node.source);
      },
    };
  },
};
