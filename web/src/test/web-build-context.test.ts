// @vitest-environment node

import { readdirSync, realpathSync } from "node:fs";
import { createRequire, isBuiltin } from "node:module";
import path from "node:path";
import ts from "typescript";
import { expect, it } from "vitest";

const webRoot = realpathSync(process.cwd());

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(file);
    return /\.[cm]?[jt]sx?$/.test(entry.name) &&
      !/\.(?:test|spec|node-test)\.[cm]?[jt]sx?$/.test(entry.name)
      ? [file]
      : [];
  });
}

function moduleReference(node: ts.Node): ts.Node | undefined {
  if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
    return node.moduleSpecifier;
  }
  if (ts.isExternalModuleReference(node)) return node.expression;
  if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) {
    return node.argument.literal;
  }
  if (ts.isCallExpression(node)) {
    const target = node.expression;
    if (target.kind === ts.SyntaxKind.ImportKeyword ||
      (ts.isIdentifier(target) && target.text === "require") ||
      (ts.isPropertyAccessExpression(target) && target.getText() === "require.resolve")) {
      return node.arguments[0];
    }
  }
}

it("resolves Web module references inside the Docker build context", () => {
  const config = ts.readConfigFile(path.join(webRoot, "tsconfig.json"), ts.sys.readFile);
  expect(config.error).toBeUndefined();
  const { options } = ts.parseJsonConfigFileContent(config.config, ts.sys, webRoot);
  const cache = ts.createModuleResolutionCache(webRoot, (file) => file, options);
  const violations: string[] = [];
  const files = [
    ...sourceFiles(path.join(webRoot, "src")),
    path.join(webRoot, "next.config.ts"),
    ...sourceFiles(path.join(webRoot, "scripts")),
  ];

  for (const file of files) {
    const source = ts.createSourceFile(file, ts.sys.readFile(file)!, ts.ScriptTarget.Latest, true);
    const requireFromFile = createRequire(file);
    function visit(node: ts.Node) {
      const reference = moduleReference(node);
      if (reference) {
        const { line } = source.getLineAndCharacterOfPosition(reference.getStart());
        const location = `${path.relative(webRoot, file)}:${line + 1}`;
        if (!ts.isStringLiteralLike(reference)) {
          violations.push(`${location}: module reference must be a string literal`);
        } else if (!isBuiltin(reference.text)) {
          try {
            // Next's bundler resolves CSS through the same @/ alias as TypeScript.
            const specifier = reference.text.startsWith("@/") && reference.text.endsWith(".css")
              ? path.resolve(webRoot, options.paths!["@/*"][0].replace("*", reference.text.slice(2)))
              : reference.text;
            const resolved = ts.resolveModuleName(reference.text, file, options, ts.sys, cache)
              .resolvedModule?.resolvedFileName ?? requireFromFile.resolve(specifier);
            const relative = path.relative(webRoot, realpathSync(resolved));
            if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
              violations.push(`${location}: ${reference.text} resolves outside web/ (${relative})`);
            }
          } catch {
            violations.push(`${location}: could not resolve ${reference.text}`);
          }
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }

  expect(violations).toEqual([]);
});
