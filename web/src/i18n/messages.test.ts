import { parse, TYPE, type MessageFormatElement } from "@formatjs/icu-messageformat-parser";
import { expect, it } from "vitest";
import en from "./messages/en.json";
import zh from "./messages/zh-TW.json";

function flatten(messages: object, parent = ""): Record<string, string> {
  return Object.fromEntries(Object.entries(messages).flatMap(([key, value]) => {
    const path = parent ? `${parent}.${key}` : key;
    return typeof value === "string" ? [[path, value]] : Object.entries(flatten(value, path));
  }));
}

function parameters(elements: MessageFormatElement[]) {
  const names = new Set<string>();
  function visit(nodes: MessageFormatElement[]) {
    for (const node of nodes) {
      switch (node.type) {
        case TYPE.argument:
        case TYPE.number:
        case TYPE.date:
        case TYPE.time:
          names.add(node.value);
          break;
        case TYPE.plural:
        case TYPE.select:
          names.add(node.value);
          for (const option of Object.values(node.options)) visit(option.value);
          break;
        case TYPE.tag:
          names.add(node.value);
          visit(node.children);
          break;
      }
    }
  }
  visit(elements);
  return [...names].sort();
}

it("keeps both message catalogs complete and ICU arguments compatible", () => {
  const source = flatten(zh);
  const translated = flatten(en);
  expect(Object.keys(translated).sort()).toEqual(Object.keys(source).sort());
  for (const [key, message] of Object.entries(source)) {
    expect(message.trim(), key).not.toBe("");
    expect(translated[key].trim(), key).not.toBe("");
    expect(parameters(parse(translated[key])), key).toEqual(parameters(parse(message)));
  }
});
