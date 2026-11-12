import type { Scan } from "./types";
import { SCAN_DISCLAIMER, SEVERITY_ORDER, summarizeFindings } from "./severity";
import { formatDateTime, formatDuration } from "./utils";

export interface ReportOptions {
  includeEvidence: boolean;
  includeRemediation: boolean;
}

export const DEFAULT_REPORT_OPTIONS: ReportOptions = {
  includeEvidence: true,
  includeRemediation: true,
};

export function buildReportData(scan: Scan, options: ReportOptions = DEFAULT_REPORT_OPTIONS) {
  const summary = summarizeFindings(scan.findings);
  return {
    project: "WebShield",
    reportVersion: "1.0",
    generatedAt: new Date().toISOString(),
    scan: {
      id: scan.id,
      name: scan.name,
      target: scan.target,
      mode: scan.mode,
      scope: scan.scope,
      status: scan.status,
      engine: scan.engine,
      scanDate: scan.startedAt,
      completedAt: scan.completedAt ?? null,
      durationMs: scan.durationMs ?? null,
      pagesTested: scan.pagesTested,
      parametersTested: scan.parametersTested,
      testsEnabled: scan.tests,
    },
    summary: {
      totalFindings: summary.total,
      sqlInjection: summary.sqli,
      crossSiteScripting: summary.xss,
      critical: summary.bySeverity.critical,
      high: summary.bySeverity.high,
      medium: summary.bySeverity.medium,
      low: summary.bySeverity.low,
      informational: summary.bySeverity.informational,
      verified: summary.verified,
      unverified: summary.unverified,
    },
    coverage: {
      pages: [...new Set(scan.checks.map((check) => check.path))],
      checks: scan.checks.map((check) => ({
        fixture: check.fixtureId,
        label: check.label,
        type: check.type,
        path: check.path,
        parameter: check.parameter,
        result: check.result,
        evidenceSummary: check.evidenceSummary,
      })),
    },
    findings: scan.findings.map((finding) => ({
      id: finding.id,
      type: finding.type,
      category: finding.category,
      title: finding.title,
      severity: finding.severity,
      confidence: finding.confidence,
      verification: finding.verification,
      verificationMethod: finding.verificationMethod,
      url: finding.url,
      method: finding.method,
      parameter: finding.parameter,
      detectedAt: finding.detectedAt,
      description: finding.description,
      risk: finding.risk,
      evidence: options.includeEvidence ? finding.evidence : undefined,
      remediation: options.includeRemediation ? finding.remediation : undefined,
      references: finding.references,
    })),
    limitations: [
      scan.mode === "demo"
        ? "This report contains simulated findings from the built-in WebShield Safe Demo Lab. No external website was tested."
        : "This report contains automated scanner alerts from an authorized external scan. Alerts are unverified until reproduced manually.",
      "Coverage is limited to the fixtures or pages listed above and the checks that were enabled.",
      "No automated scanner can enumerate every vulnerability class; SQL injection and XSS detection are probabilistic.",
      "Application business logic, authentication design and access-control flaws outside these checks were not assessed.",
    ],
    disclaimer: SCAN_DISCLAIMER,
  };
}

export type ReportData = ReturnType<typeof buildReportData>;

export function reportFileName(scan: Scan, extension: "json" | "pdf") {
  const safe = scan.name.replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "") || "scan";
  return `webshield-${safe}-${scan.id.slice(0, 8)}.${extension}`;
}

export function downloadTextFile(filename: string, contents: string, type: string) {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function downloadJsonReport(scan: Scan, options: ReportOptions = DEFAULT_REPORT_OPTIONS) {
  const data = buildReportData(scan, options);
  downloadTextFile(
    reportFileName(scan, "json"),
    JSON.stringify(data, null, 2),
    "application/json",
  );
}

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 48;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

function ascii(value: string) {
  return value
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[^\x20-\x7E\n]/g, "");
}

export async function createPdfDocument(scan: Scan, options: ReportOptions = DEFAULT_REPORT_OPTIONS) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const data = buildReportData(scan, options);

  let y = 0;
  let pageNumber = 1;

  const header = () => {
    doc.setFillColor(15, 33, 64);
    doc.rect(0, 0, PAGE_WIDTH, 64, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("WebShield", MARGIN, 30);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Automated Web Application Security Testing", MARGIN, 46);
    doc.text(`Page ${pageNumber}`, PAGE_WIDTH - MARGIN - 40, 30);
    doc.setTextColor(31, 41, 55);
    y = 92;
  };

  const newPage = () => {
    doc.addPage();
    pageNumber += 1;
    header();
  };

  const ensure = (height: number) => {
    if (y + height > PAGE_HEIGHT - 64) newPage();
  };

  const heading = (text: string) => {
    ensure(34);
    y += 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 33, 64);
    doc.text(ascii(text), MARGIN, y);
    y += 8;
    doc.setDrawColor(226, 232, 240);
    doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
    y += 16;
    doc.setTextColor(31, 41, 55);
  };

  const paragraph = (text: string, size = 9.5, style: "normal" | "bold" = "normal") => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(ascii(text), CONTENT_WIDTH) as string[];
    for (const line of lines) {
      ensure(14);
      doc.text(line, MARGIN, y);
      y += 13;
    }
  };

  const labelValue = (label: string, value: string) => {
    ensure(16);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(`${ascii(label)}:`, MARGIN, y);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(ascii(value), CONTENT_WIDTH - 130) as string[];
    doc.text(lines, MARGIN + 130, y);
    y += Math.max(14, lines.length * 12);
  };

  header();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(ascii(scan.name), MARGIN, y);
  y += 22;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text("Vulnerability scan report", MARGIN, y);
  y += 24;

  labelValue("Scan ID", scan.id);
  labelValue("Target", scan.target);
  labelValue("Scan date", formatDateTime(scan.startedAt));
  labelValue("Scan mode", scan.mode === "demo" ? "Safe Demo Lab (simulated)" : "Authorized external (OWASP ZAP)");
  labelValue("Status", scan.status);
  labelValue("Duration", formatDuration(scan.durationMs));
  labelValue("Pages tested", String(scan.pagesTested));
  labelValue("Parameters tested", String(scan.parametersTested));
  labelValue("Engine", scan.engine);
  y += 6;

  heading("Summary");
  labelValue("Total findings", String(data.summary.totalFindings));
  labelValue("SQL Injection", String(data.summary.sqlInjection));
  labelValue("Cross-Site Scripting", String(data.summary.crossSiteScripting));
  SEVERITY_ORDER.forEach((severity) => {
    labelValue(severity[0].toUpperCase() + severity.slice(1), String(data.summary[severity]));
  });
  labelValue("Verified / unverified", `${data.summary.verified} / ${data.summary.unverified}`);

  heading("Findings");
  if (scan.findings.length === 0) {
    paragraph("No findings were recorded for this scan.");
  }
  scan.findings.forEach((finding, index) => {
    ensure(90);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(ascii(`${index + 1}. ${finding.title}`), MARGIN, y);
    y += 16;
    labelValue("Severity / confidence", `${finding.severity} / ${finding.confidence}`);
    labelValue("Verification", `${finding.verification} (${finding.verificationMethod})`);
    labelValue("Endpoint", `${finding.method} ${finding.url}`);
    labelValue("Parameter", finding.parameter);
    paragraph(finding.description);
    paragraph(`Risk: ${finding.risk}`);
    if (options.includeEvidence) {
      paragraph(`Evidence payload: ${finding.evidence.payload}`);
      paragraph(`Evidence analysis: ${finding.evidence.analysis}`);
      paragraph(`Response snippet: ${finding.evidence.responseSnippet}`);
    }
    if (options.includeRemediation) {
      paragraph(`Remediation: ${finding.remediation}`);
    }
    paragraph(`References: ${finding.references.join("  ")}`);
    y += 8;
  });

  heading("Coverage and limitations");
  paragraph(`Coverage: ${data.coverage.checks.length} checks across ${data.coverage.pages.length} pages/endpoints.`);
  data.limitations.forEach((limitation) => paragraph(`- ${limitation}`));

  y += 8;
  ensure(60);
  doc.setDrawColor(207, 217, 229);
  doc.setFillColor(247, 248, 250);
  doc.rect(MARGIN, y - 12, CONTENT_WIDTH, 46, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Disclaimer", MARGIN + 10, y + 2);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  const disclaimerLines = doc.splitTextToSize(ascii(SCAN_DISCLAIMER), CONTENT_WIDTH - 20) as string[];
  doc.text(disclaimerLines, MARGIN + 10, y + 15);

  return doc;
}

export async function downloadPdfReport(scan: Scan, options: ReportOptions = DEFAULT_REPORT_OPTIONS) {
  const doc = await createPdfDocument(scan, options);
  doc.save(reportFileName(scan, "pdf"));
}
