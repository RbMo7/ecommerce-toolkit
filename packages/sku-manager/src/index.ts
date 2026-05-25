export interface SkuSpec {
  prefix: string;
  separator: string;
  categoryDigits: number;
  attributeDigits: number;
  useChecksum: boolean;
}

export interface SkuAttributes {
  category: string;
  [key: string]: string | undefined;
}

export interface ParsedSku {
  prefix: string;
  category: string;
  attributes: Record<string, string>;
  checksum?: string;
  isValid: boolean;
}

const DEFAULT_SPEC: SkuSpec = {
  prefix: "PRD",
  separator: "-",
  categoryDigits: 3,
  attributeDigits: 3,
  useChecksum: true,
};

const CATEGORY_CODES: Record<string, string> = {
  electronics: "001",
  clothing: "002",
  home: "003",
  food: "004",
  books: "005",
  toys: "006",
  sports: "007",
  beauty: "008",
  automotive: "009",
  office: "010",
  garden: "011",
  music: "012",
};

const REVERSE_CATEGORY: Record<string, string> = {};
for (const [k, v] of Object.entries(CATEGORY_CODES)) {
  REVERSE_CATEGORY[v] = k;
}

const NON_DIGIT = /\D/g;

function luhnChecksum(digitStr: string): string {
  const cleaned = digitStr.replace(NON_DIGIT, "");
  if (cleaned.length === 0) return "A";
  let sum = 0;
  let alternate = false;
  for (let i = cleaned.length - 1; i >= 0; i--) {
    let n = Number.parseInt(cleaned[i] ?? "0", 10);
    if (alternate) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alternate = !alternate;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return String.fromCharCode(65 + checkDigit);
}

function encodeValue(
  value: string,
  digits: number,
  lookup?: Record<string, string>,
): string {
  if (lookup) {
    const code = lookup[value.toLowerCase()];
    if (code) return code;
  }
  // Fallback: hash string to digits
  let hash = 0;
  for (const ch of value) {
    hash = (hash * 31 + ch.charCodeAt(0)) % 10 ** digits;
  }
  return String(hash).padStart(digits, "0");
}

function decodeValue(
  code: string,
  _digits: number,
  lookup?: Record<string, string>,
): string {
  if (lookup) {
    const found = lookup[code];
    if (found) return found;
  }
  return `attr_${code}`;
}

export function createSkuSpec(config: Partial<SkuSpec> = {}): SkuSpec {
  return { ...DEFAULT_SPEC, ...config };
}

export function generateSku(
  spec: SkuSpec,
  category: string,
  attributes: SkuAttributes,
): string {
  const parts: string[] = [spec.prefix];

  const catCode = encodeValue(category, spec.categoryDigits, CATEGORY_CODES);
  parts.push(catCode);

  const attrCodes: string[] = [];
  for (const [key, value] of Object.entries(attributes)) {
    if (key === "category") continue;
    if (value !== undefined) {
      attrCodes.push(
        encodeValue(value, spec.attributeDigits, undefined),
      );
    }
  }
  parts.push(attrCodes.join(""));

  let sku = parts.join(spec.separator);

  if (spec.useChecksum) {
    const checksum = luhnChecksum(sku);
    sku = `${sku}${spec.separator}${checksum}`;
  }

  return sku;
}

export function parseSku(sku: string, spec: SkuSpec): ParsedSku {
  const parts = sku.split(spec.separator);

  if (parts.length < 3) {
    return { prefix: "", category: "", attributes: {}, isValid: false };
  }

  const prefix = parts[0] ?? "";
  const catCode = parts[1] ?? "";
  const category = decodeValue(catCode, spec.categoryDigits, REVERSE_CATEGORY);
  const attrStr = parts.slice(2, spec.useChecksum ? -1 : undefined).join("");
  const checksum = spec.useChecksum ? parts[parts.length - 1] : undefined;

  const attrRegex = new RegExp(`.{1,${spec.attributeDigits}}`, "g");
  const attrCodes = attrStr.match(attrRegex) ?? [];
  const attributes: Record<string, string> = { category };

  for (let i = 0; i < attrCodes.length; i++) {
    const code = attrCodes[i];
    if (code) {
      attributes[`attr${i + 1}`] = decodeValue(code, spec.attributeDigits);
    }
  }

  let isValid = true;
  if (spec.useChecksum && checksum) {
    const base = sku.slice(0, -1); // remove current checksum char
    const expectedChecksum = luhnChecksum(base);
    isValid = checksum === expectedChecksum;
  }

  return { prefix, category, attributes, checksum, isValid };
}

export function validateSku(sku: string, spec: SkuSpec): boolean {
  const result = parseSku(sku, spec);
  if (!result.isValid) return false;
  return result.prefix === spec.prefix;
}

export function suggestSku(sku: string, spec: SkuSpec): string {
  if (validateSku(sku, spec)) return sku;
  const result = parseSku(sku, spec);
  if (result.prefix !== spec.prefix) return sku;

  // Try each possible checksum character
  for (let i = 0; i < 26; i++) {
    const candidate = `${sku.slice(0, -1)}${String.fromCharCode(65 + i)}`;
    if (validateSku(candidate, spec)) return candidate;
  }
  return sku;
}

export function batchGenerateSkus(
  spec: SkuSpec,
  items: { category: string; attributes: SkuAttributes }[],
): string[] {
  return items.map((item) => generateSku(spec, item.category, item.attributes));
}
