import type { Rule } from 'eslint';

export const noComments: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Code carries no comments; meaning lives in names, types, tests and docs/.',
    },
    messages: {
      comment:
        'Code carries no comments (AGENTS.md section 10). Move what this says into a name, a type, a test or docs/.',
    },
    schema: [],
  },
  create(context) {
    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          if (comment.loc) {
            context.report({ loc: comment.loc, messageId: 'comment' });
          }
        }
      },
    };
  },
};
