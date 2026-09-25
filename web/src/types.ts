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
  fix_snippet?: string;
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
  timestamp?: string;
  timezone?: string;
  filters_applied?: {
    min_confidence?: number;
    min_severity?: string | null;
    exclude_tests?: boolean;
    include_sarif?: boolean;
    include_html?: boolean;
  };
  summary: SummaryDto;
  findings: FindingDto[];
  sources: Record<string, string>;
  sarif?: any;
  html_report?: string;
  errors?: any[];
  error?: string;
}

export interface HistoryEntry {
  id: string;
  created_at: string;
  target: string;
  mode: ScanMode;
  files: number;
  duration_ms: number;
  summary: SummaryDto;
  severity_max: Severity | "all";
  severity_count: number;
  result: ScanResponse;
}


export interface RuleDto {
  id: string;
  title: string;
  severity: string;
  cwe?: string;
  owasp?: string;
  description: string;
  recommendation?: string;
  fix_snippet?: string;
}

export type ScanMode = "paste" | "files" | "github";

export interface GitHubUser {
  id: number;
  login: string;
  name: string;
  avatar_url: string;
  html_url: string;
  public_repos: number;
  total_private_repos?: number;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  description: string;
  language: string;
  default_branch: string;
  stargazers_count: number;
  forks_count?: number;
  updated_at?: string;
}

export type ScanStatus = "idle" | "loading" | "error" | "ready";

export interface UploadedFile {
  name: string;
  size: number;
  content: string;
}

export type ReportFormat = "sarif" | "json" | "html";

export interface ScanOptions {
  min_confidence: number;
  min_severity: Severity;
  exclude_tests: boolean;
  ruleset?: string;
  report_formats: ReportFormat[];
}
