/**
 * Cross-Site Scripting detection module for the Safe Demo Lab.
 *
 * The module never executes a payload. It analyses deterministic simulated
 * responses:
 *  - reflection/stored: is the raw payload present, or was it encoded?
 *  - DOM: which sink receives the URL parameter (innerHTML vs textContent)?
 *
 * This distinction is reported in the UI: a raw reflection is verified as a
 * reflection, while DOM findings are verified by sink analysis. Neither is
 * presented as confirmed script execution.
 */

import {
  XSS_PAYLOADS,
  escapeHtml,
  type XssFixture,
  type XssPayload,
} from "./fixtures";

export interface XssSimulation {
  payload: string;
  response: string;
  rawPayloadPresent: boolean;
  sink: "innerHTML" | "textContent" | "escaped" | "none";
}

function renderReflected(fixture: XssFixture, payload: string) {
  const rendered =
    fixture.encoding === "html-encoded" || fixture.encoding === "validated-escaped"
      ? escapeHtml(payload)
      : payload;

  return `<!doctype html><html><body>
  <main>
    <h1>${fixture.path.includes("newsletter") ? "Newsletter signup" : "Search"}</h1>
    <p class="query">You searched for: <span id="query">${rendered}</span></p>
    <p class="empty">No matching records were found.</p>
  </main>
</body></html>`;
}

function renderStored(fixture: XssFixture, payload: string) {
  const rendered = fixture.encoding === "html-encoded" ? escapeHtml(payload) : payload;
  return `<!doctype html><html><body>
  <main>
    <h1>Community comments</h1>
    <article class="comment">
      <p class="author">demo_user</p>
      <div class="comment-body">${rendered}</div>
    </article>
  </main>
</body></html>`;
}

function renderDom(fixture: XssFixture, payload: string) {
  const sink = fixture.encoding === "dom-innerhtml" ? "innerHTML" : "textContent";
  return `<!doctype html><html><body>
  <main>
    <h1>Your profile</h1>
    <p>Hello, <span id="greeting"></span></p>
  </main>
  <script>
    const name = new URLSearchParams(window.location.search).get("name") || "guest";
    document.getElementById("greeting").${sink} = name; // simulated payload: ${escapeJs(payload)}
  </script>
</body></html>`;
}

function escapeJs(value: string) {
  return value.replace(/[<>\\]/g, (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`);
}

export function simulateXss(
  fixture: XssFixture,
  payload: XssPayload,
): XssSimulation {
  const response =
    fixture.kind === "stored"
      ? renderStored(fixture, payload.value)
      : fixture.kind === "dom"
        ? renderDom(fixture, payload.value)
        : renderReflected(fixture, payload.value);

  return {
    payload: payload.value,
    response,
    rawPayloadPresent: response.includes(payload.value),
    sink:
      fixture.encoding === "dom-innerhtml"
        ? "innerHTML"
        : fixture.encoding === "dom-textcontent"
          ? "textContent"
          : fixture.encoding === "none"
            ? "none"
            : "escaped",
  };
}

export interface XssDetection {
  vulnerable: boolean;
  kind: "reflected" | "stored" | "dom" | null;
  payload: XssPayload;
  simulation: XssSimulation;
  summary: string;
  severity: "high" | "medium";
  confidence: "high" | "medium" | "low";
  verificationMethod: "payload-reflection" | "stored-payload-replay" | "dom-sink-analysis";
  payloadsTested: number;
}

export function detectXss(fixture: XssFixture): XssDetection {
  const results = XSS_PAYLOADS.map((payload) => ({
    payload,
    simulation: simulateXss(fixture, payload),
  }));
  const payloadsTested = results.length;
  const control = results[0];

  if (fixture.kind === "dom") {
    const exploit = results.find((item) => item.payload.kind === "script-tag")!;
    const unsafeSink = exploit.simulation.sink === "innerHTML";
    return {
      vulnerable: unsafeSink,
      kind: unsafeSink ? "dom" : null,
      payload: exploit.payload,
      simulation: exploit.simulation,
      severity: "medium",
      confidence: "medium",
      verificationMethod: "dom-sink-analysis",
      summary: unsafeSink
        ? `Static sink analysis shows the "${fixture.parameter}" URL parameter flows into innerHTML, which interprets markup. A DOM-based XSS sink is present; script execution was not performed.`
        : `Static sink analysis shows the "${fixture.parameter}" parameter is assigned with textContent, so markup is rendered as inert text.`,
      payloadsTested,
    };
  }

  const vulnerableResult = results.find(
    (item) => item.payload.kind !== "benign" && item.simulation.rawPayloadPresent,
  );

  if (vulnerableResult) {
    const stored = fixture.kind === "stored";
    return {
      vulnerable: true,
      kind: fixture.kind,
      payload: vulnerableResult.payload,
      simulation: vulnerableResult.simulation,
      severity: stored ? "high" : "medium",
      confidence: "high",
      verificationMethod: stored ? "stored-payload-replay" : "payload-reflection",
      summary: stored
        ? "The payload was stored and returned unencoded when the comment list was re-rendered, verifying persistent (stored) unsafe output."
        : "The payload appeared verbatim in the HTML response, verifying that untrusted input reaches an executable HTML context without encoding.",
      payloadsTested,
    };
  }

  return {
    vulnerable: false,
    kind: null,
    payload: control.payload,
    simulation: control.simulation,
    severity: "medium",
    confidence: "high",
    verificationMethod: "payload-reflection",
    summary:
      "All probes were output-encoded or safely assigned, and no raw payload appeared in an executable context.",
    payloadsTested,
  };
}
