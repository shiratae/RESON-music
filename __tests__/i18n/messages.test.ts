import en from "@/messages/en.json";
import ja from "@/messages/ja.json";

function leafKeys(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return [prefix];
  }

  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    leafKeys(child, prefix ? `${prefix}.${key}` : key)
  );
}

describe("i18n message catalogs", () => {
  it("keeps Japanese and English message keys in sync", () => {
    expect(leafKeys(en).sort()).toEqual(leafKeys(ja).sort());
  });
});
