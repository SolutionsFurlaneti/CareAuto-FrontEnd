import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = path.resolve('src');
const normalize = (text) => text.replace(/\s+/g, ' ').trim();
function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? files(full) : /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}
function parse(file) {
  return ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
}
const keys = new Set();
for (const file of files(path.join(root, 'i18n', 'catalogs'))) {
  function visit(node) {
    if (
      ts.isPropertyAssignment(node) &&
      (ts.isStringLiteral(node.name) || ts.isIdentifier(node.name))
    )
      keys.add(normalize(node.name.text));
    ts.forEachChild(node, visit);
  }
  visit(parse(file));
}
const missing = [];
for (const file of files(root).filter(
  (file) => !file.includes(`${path.sep}i18n${path.sep}`) && !file.endsWith('.stories.tsx'),
)) {
  const source = parse(file);
  function visit(node) {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      ['t', 'translate'].includes(node.expression.text)
    ) {
      const arg = node.arguments[0];
      if (
        arg &&
        (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg)) &&
        !keys.has(normalize(arg.text))
      ) {
        const line = source.getLineAndCharacterOfPosition(arg.getStart(source)).line + 1;
        missing.push(`${path.relative(process.cwd(), file)}:${line} ${JSON.stringify(arg.text)}`);
      }
      if (process.argv.includes('--frozen')) {
        let parent = node.parent;
        while (parent && !ts.isFunctionLike(parent)) parent = parent.parent;
        if (!parent) {
          const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
          missing.push(
            `${path.relative(process.cwd(), file)}:${line} translation evaluated at module load`,
          );
        }
      }
    }
    if (
      process.argv.includes('--metadata') &&
      ts.isPropertyAssignment(node) &&
      ts.isIdentifier(node.name) &&
      ['label', 'title', 'description', 'singular', 'eyebrow', 'hint', 'message'].includes(
        node.name.text,
      ) &&
      ts.isStringLiteral(node.initializer) &&
      !keys.has(normalize(node.initializer.text))
    ) {
      const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
      missing.push(
        `${path.relative(process.cwd(), file)}:${line} ${node.name.text}: ${JSON.stringify(node.initializer.text)}`,
      );
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}
if (missing.length) {
  process.stderr.write(
    `Missing English translations (${missing.length}):\n${missing.join('\n')}\n`,
  );
  process.exitCode = 1;
} else {
  process.stdout.write(
    `English catalog checked: ${keys.size} entries; all static translation calls are covered.\n`,
  );
}
