export type Severity =
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "info"
  | "all";

export interface DataFlowStep {
  line: number;
  variable: string;
  step: number;
  [k: string]: any;
}

export interface FindingDto {
  rule_id: string;
  title: string;
  severity: Exclude<Severity, "all">;
  file_path: string;
  line: number;
  column: number;
  end_line?: number | null;
  description: string;
  cwe?: string | null;
  owasp?: string | null;
  confidence: number;
  evidence: string;
  source?: string | null;
  sink?: string | null;
  data_flow?: DataFlowStep[];
  recommendation: string;
  metadata?: Record<string, any>;
  timestamp?: string;
}

export interface SummaryDto {
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
}

export interface ScanResponse {
  ok: boolean;
  target: string;
  files_scanned: number;
  duration_ms: number;
  sast_version: string;
  summary: SummaryDto;
  findings: FindingDto[];
  sources: Record<string, string>;
  sarif?: any;
  html_report?: string;
  errors?: any[];
  error?: string;
}

export interface RuleDto {
  id: string;
  title: string;
  severity: string;
  cwe?: string;
  owasp?: string;
  description: string;
  recommendation?: string;
}

export type ScanMode = "paste" | "files";

export type ScanStatus = "idle" | "loading" | "error" | "ready";

export interface UploadedFile {
  name: string;
  size: number;
  content: string;
}

export interface ScanOptions {
  min_confidence: number;
  min_severity: Exclude<Severity, "all">;
  exclude_tests: boolean;
}
