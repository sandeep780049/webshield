/**
 * SQL Injection detection module for the Safe Demo Lab.
 *
 * The simulator models two server implementations:
 *  - "string-concatenation": untrusted input becomes part of the SQL statement.
 *  - "parameterized": the input is bound as a value and cannot change the query.
 *
 * Nothing here talks to a database. The output is a deterministic simulation
 * used to demonstrate detection logic against controlled fixtures.
 */

import {
  SQLI_PAYLOADS,
  type SqliFixture,
  type SqliPayload,
} from "./fixtures";

export const SQL_ERROR_SIGNATURE =
  "You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version";

export interface SqlSimulation {
  payload: string;
  statement: string;
  rowCount: number;
  error?: string;
  delayMs: number;
  authBypass: boolean;
}

export function simulateSqlQuery(
  fixture: SqliFixture,
  payload: SqliPayload,
): SqlSimulation {
  const parameterized = fixture.implementation === "parameterized";

  if (parameterized) {
    const matches = fixture.dataset.filter((row) =>
      row.toLowerCase().includes(payload.value.toLowerCase()),
    );
    return {
      payload: payload.value,
      statement: `SELECT id, name, category FROM ${fixture.path.includes("login") ? "users" : "products"} WHERE ${fixture.parameter} = ?`,
      rowCount: payload.kind === "benign" ? Math.max(matches.length, 1) : 0,
      delayMs: 2,
      authBypass: false,
    };
  }

  const statement = fixture.path.includes("login")
    ? `SELECT id, username FROM users WHERE username = '${payload.value}' AND password = '…'`
    : `SELECT id, name, category FROM products WHERE category = '${payload.value}'`;

  switch (payload.kind) {
    case "error":
      return {
        payload: payload.value,
        statement,
        rowCount: 0,
        error: `${SQL_ERROR_SIGNATURE} near ''' at line 1`,
        delayMs: 3,
        authBypass: false,
      };
    case "boolean-true":
      return {
        payload: payload.value,
        statement,
        rowCount: fixture.dataset.length,
        delayMs: 3,
        authBypass: false,
      };
    case "boolean-false":
      return {
        payload: payload.value,
        statement,
        rowCount: 0,
        delayMs: 3,
        authBypass: false,
      };
    case "time":
      return {
        payload: payload.value,
        statement,
        rowCount: fixture.dataset.length,
        delayMs: 5_000,
        authBypass: false,
      };
    case "auth-bypass":
      return {
        payload: payload.value,
        statement,
        rowCount: 1,
        delayMs: 4,
        authBypass: fixture.path.includes("login"),
      };
    case "benign":
    default: {
      const matches = fixture.dataset.filter((row) =>
        row.toLowerCase().includes(payload.value.toLowerCase()),
      );
      return {
        payload: payload.value,
        statement,
        rowCount: matches.length,
        delayMs: 3,
        authBypass: false,
      };
    }
  }
}

export interface SqliDetection {
  vulnerable: boolean;
  kind: "error" | "boolean" | "time" | "auth-bypass" | null;
  confidence: "high" | "medium" | "low";
  payload: SqliPayload;
  simulation: SqlSimulation;
  pairedSimulation?: SqlSimulation;
  summary: string;
  payloadsTested: number;
}

export function detectSqli(fixture: SqliFixture): SqliDetection {
  const results = SQLI_PAYLOADS.map((payload) => ({
    payload,
    simulation: simulateSqlQuery(fixture, payload),
  }));

  const errorResult = results.find(
    (item) => item.payload.kind === "error" && item.simulation.error,
  );
  if (errorResult) {
    return {
      vulnerable: true,
      kind: "error",
      confidence: "high",
      payload: errorResult.payload,
      simulation: errorResult.simulation,
      summary:
        "The response contained a database syntax error that revealed the injected quote reached the SQL parser.",
      payloadsTested: results.length,
    };
  }

  const trueResult = results.find((item) => item.payload.kind === "boolean-true");
  const falseResult = results.find((item) => item.payload.kind === "boolean-false");
  if (
    trueResult &&
    falseResult &&
    trueResult.simulation.rowCount !== falseResult.simulation.rowCount
  ) {
    return {
      vulnerable: true,
      kind: "boolean",
      confidence: "high",
      payload: trueResult.payload,
      simulation: trueResult.simulation,
      pairedSimulation: falseResult.simulation,
      summary: `A boolean payload changed the result set (${trueResult.simulation.rowCount} rows TRUE vs ${falseResult.simulation.rowCount} rows FALSE), showing the input controls query logic.`,
      payloadsTested: results.length,
    };
  }

  const timeResult = results.find(
    (item) => item.payload.kind === "time" && item.simulation.delayMs >= 5_000,
  );
  if (timeResult) {
    return {
      vulnerable: true,
      kind: "time",
      confidence: "medium",
      payload: timeResult.payload,
      simulation: timeResult.simulation,
      summary: `The time-based probe introduced a ${timeResult.simulation.delayMs} ms delay, consistent with an injected SLEEP() call. Timing evidence is rated medium confidence because network variance can mimic delays.`,
      payloadsTested: results.length,
    };
  }

  const bypassResult = results.find(
    (item) => item.payload.kind === "auth-bypass" && item.simulation.authBypass,
  );
  if (bypassResult) {
    return {
      vulnerable: true,
      kind: "auth-bypass",
      confidence: "medium",
      payload: bypassResult.payload,
      simulation: bypassResult.simulation,
      summary:
        "A comment-sequence payload returned a user row without a valid password, indicating an authentication bypass.",
      payloadsTested: results.length,
    };
  }

  const control = results[0];
  return {
    vulnerable: false,
    kind: null,
    confidence: "high",
    payload: control.payload,
    simulation: control.simulation,
    summary: `All ${results.length} probes were treated as literal values. No SQL error, boolean differential, timing delay or authentication bypass was observed.`,
    payloadsTested: results.length,
  };
}
