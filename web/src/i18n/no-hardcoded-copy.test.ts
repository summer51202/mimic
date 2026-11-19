import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { expect, it } from "vitest";

const textAttributes = new Set(["aria-label", "title", "alt", "placeholder", "label"]);
const sourceRoot = join(process.cwd(), "src");
const invariantCopy = new Set([
  "mimic", "Mimic ID", "Mimiku", // Product name, public identifier, and character name.
  "TWD", "USD", "JPY", // Currency codes are identifiers.
]);

function sourceFiles(directory: string): string[] {
  return readdirSync(join(sourceRoot, directory), { withFileTypes: true })
    .flatMap((entry) => {
      const path = directory ? `${directory}/${entry.name}` : entry.name;
      if (entry.isDirectory()) return path === "test" || path === "i18n/messages" ? [] : sourceFiles(path);
      return !/\.test\./.test(path) && /\.(?:[cm]?[jt]sx?|css|json|svg|html)$/.test(path) ? [path] : [];
    });
}

it("keeps hardcoded user-facing copy out of src", () => {
  const found: string[] = [];
  for (const path of sourceFiles("").sort()) {
    const source = readFileSync(join(sourceRoot, path), "utf8");
    const lines = source.split("\n");
    const exempt = (line: string) => /\/\/ i18n-exempt: \S/.test(line);
    for (const [index, line] of lines.entries()) {
      if (!exempt(line) && /[\u3040-\u30ff\u3400-\u9fff]/.test(line)) {
        found.push(`${path}:${index + 1} [CJK] ${line.trim()}`);
      }
    }
    if (!path.endsWith(".tsx")) continue;
    const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    function check(node: ts.Node, value: string, attribute?: string) {
      const copy = value.trim();
      const { line } = ast.getLineAndCharacterOfPosition(node.getStart(ast));
      if (!/\p{Script=Latin}/u.test(copy) || invariantCopy.has(copy) || exempt(lines[line])) return;
      // The app navigation locator is a stable e2e contract.
      if (attribute === "aria-label" && copy === "Primary app sections") return;
      found.push(`${path}:${line + 1} [English] ${copy}`);
    }
    function visit(node: ts.Node) {
      if (ts.isJsxText(node)) check(node, node.text);
      if (ts.isJsxAttribute(node) && textAttributes.has(node.name.getText(ast))) {
        const initializer = node.initializer;
        const value = initializer && ts.isJsxExpression(initializer) ? initializer.expression : initializer;
        if (value && (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value))) {
          check(value, value.text, node.name.getText(ast));
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(ast);
  }
  expect(found, found.join("\n")).toEqual([]);
});
