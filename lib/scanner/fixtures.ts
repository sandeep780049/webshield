/**
 * Safe Demo Lab fixtures.
 *
 * Every fixture below is a self-contained simulation of a page that either does
 * or does not handle untrusted input safely. No real database is queried and no
 * script is executed: the scanners analyse deterministic simulated responses.
 */

export type SqlImplementation = "string-concatenation" | "parameterized";

export interface SqliFixture {
  id: string;
  path: string;
  method: "GET" | "POST";
  parameter: string;
  title: string;
  description: string;
  implementation: SqlImplementation;
  dataset: string[];
  expected: "vulnerable" | "safe";
}

export const SQLI_FIXTURES: SqliFixture[] = [
  {
    id: "sqli-vulnerable-category",
    path: "/lab/products",
    method: "GET",
    parameter: "category",
    title: "Product category filter",
    description:
      "Builds the WHERE clause by concatenating the category parameter into raw SQL (string concatenation).",
    implementation: "string-concatenation",
    dataset: ["Laptops", "Monitors", "Keyboards"],
    expected: "vulnerable",
  },
  {
    id: "sqli-safe-category",
    path: "/lab/products-safe",
    method: "GET",
    parameter: "category",
    title: "Product category filter (parameterized)",
    description:
      "Uses a prepared statement with a bound parameter, so input can never change the query structure.",
    implementation: "parameterized",
    dataset: ["Laptops", "Monitors", "Keyboards"],
    expected: "safe",
  },
  {
    id: "sqli-vulnerable-login",
    path: "/lab/login",
    method: "POST",
    parameter: "username",
    title: "Account login form",
    description:
      "Interpolates the username directly into the login query, allowing an authentication bypass payload.",
    implementation: "string-concatenation",
    dataset: ["admin"],
    expected: "vulnerable",
  },
  {
    id: "sqli-safe-login",
    path: "/lab/login-safe",
    method: "POST",
    parameter: "username",
    title: "Account login form (parameterized)",
    description:
      "Verifies credentials through a prepared statement and constant-time password comparison.",
    implementation: "parameterized",
    dataset: ["admin"],
    expected: "safe",
  },
];

export type SqliPayloadKind =
  | "benign"
  | "error"
  | "boolean-true"
  | "boolean-false"
  | "time"
  | "auth-bypass";

export interface SqliPayload {
  value: string;
  kind: SqliPayloadKind;
  label: string;
}

export const SQLI_PAYLOADS: SqliPayload[] = [
  { value: "Laptops", kind: "benign", label: "Benign control value" },
  { value: "'", kind: "error", label: "Single quote (syntax error probe)" },
  { value: "1' AND '1'='1", kind: "boolean-true", label: "Boolean TRUE condition" },
  { value: "1' AND '1'='2", kind: "boolean-false", label: "Boolean FALSE condition" },
  { value: "1' AND SLEEP(5)-- ", kind: "time", label: "Time-based delay probe" },
  { value: "admin'--", kind: "auth-bypass", label: "Authentication bypass probe" },
];

export interface XssFixture {
  id: string;
  path: string;
  method: "GET" | "POST";
  parameter: string;
  title: string;
  description: string;
  kind: "reflected" | "stored" | "dom";
  encoding:
    | "none"
    | "html-encoded"
    | "validated-escaped"
    | "ui-insertion"
    | "dom-innerhtml"
    | "dom-textcontent";
  expected: "vulnerable" | "safe";
}

export const XSS_FIXTURES: XssFixture[] = [
  {
    id: "xss-reflected-vulnerable",
    path: "/lab/search",
    method: "GET",
    parameter: "q",
    title: "Search results page",
    description:
      "Writes the search term into the HTML response without output encoding.",
    kind: "reflected",
    encoding: "none",
    expected: "vulnerable",
  },
  {
    id: "xss-reflected-safe",
    path: "/lab/search-safe",
    method: "GET",
    parameter: "q",
    title: "Search results page (HTML encoded)",
    description:
      "Encodes the search term with HTML entity encoding before it reaches the response.",
    kind: "reflected",
    encoding: "html-encoded",
    expected: "safe",
  },
  {
    id: "xss-stored-vulnerable",
    path: "/lab/comments",
    method: "POST",
    parameter: "comment",
    title: "Comment board",
    description:
      "Stores comments verbatim and renders them into every visitor's page without encoding (stored XSS).",
    kind: "stored",
    encoding: "none",
    expected: "vulnerable",
  },
  {
    id: "xss-stored-safe",
    path: "/lab/comments-safe",
    method: "POST",
    parameter: "comment",
    title: "Comment board (encoded on render)",
    description:
      "Stores comments as plain text and HTML-encodes them when rendering the page.",
    kind: "stored",
    encoding: "html-encoded",
    expected: "safe",
  },
  {
    id: "xss-dom-vulnerable",
    path: "/lab/profile",
    method: "GET",
    parameter: "name",
    title: "Profile greeting (DOM sink)",
    description:
      "Reads the name parameter from the URL and assigns it to innerHTML, an unsafe DOM sink.",
    kind: "dom",
    encoding: "dom-innerhtml",
    expected: "vulnerable",
  },
  {
    id: "xss-dom-safe",
    path: "/lab/profile-safe",
    method: "GET",
    parameter: "name",
    title: "Profile greeting (textContent)",
    description:
      "Writes the name parameter with textContent, which cannot create executable markup.",
    kind: "dom",
    encoding: "dom-textcontent",
    expected: "safe",
  },
  {
    id: "xss-parameterized-search",
    path: "/lab/newsletter",
    method: "GET",
    parameter: "email",
    title: "Newsletter signup lookup",
    description:
      "Validates and escapes the email parameter and returns a plain-text confirmation only.",
    kind: "reflected",
    encoding: "validated-escaped",
    expected: "safe",
  },
];

export type XssPayloadKind = "script-tag" | "img-handler" | "attribute-breakout" | "benign";

export interface XssPayload {
  value: string;
  kind: XssPayloadKind;
  label: string;
}

export const XSS_PAYLOADS: XssPayload[] = [
  { value: "laptop", kind: "benign", label: "Benign control value" },
  {
    value: '<script>alert("WS_XSS")</script>',
    kind: "script-tag",
    label: "Script tag payload",
  },
  {
    value: '"><img src=x onerror=alert("WS_XSS")>',
    kind: "img-handler",
    label: "Attribute breakout / event handler payload",
  },
  {
    value: '"><svg/onload=alert("WS_XSS")>',
    kind: "attribute-breakout",
    label: "SVG onload payload",
  },
];

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function demoPage(path: string) {
  return `webshield-demo://lab${path}`;
}
