from __future__ import annotations

from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone


class Severity(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"

    @property
    def emoji(self) -> str:
        return {
            Severity.CRITICAL: "🔴",
            Severity.HIGH: "🟠",
            Severity.MEDIUM: "🟡",
            Severity.LOW: "🟢",
            Severity.INFO: "🔵",
        }[self]

    @property
    def order(self) -> int:
        return {
            Severity.CRITICAL: 0,
            Severity.HIGH: 1,
            Severity.MEDIUM: 2,
            Severity.LOW: 3,
            Severity.INFO: 4,
        }[self]

    @classmethod
    def from_str(cls, value: str) -> "Severity":
        try:
            return cls(value.lower())
        except ValueError:
            return cls.INFO


@dataclass
class Finding:
    rule_id: str
    title: str
    severity: Severity
    file_path: str
    line: int
    column: int = 0
    end_line: Optional[int] = None
    description: str = ""
    cwe: Optional[str] = None
    owasp: Optional[str] = None
    confidence: float = 0.0
    evidence: str = ""
    source: Optional[str] = None
    sink: Optional[str] = None
    data_flow: List[Dict[str, Any]] = field(default_factory=list)
    recommendation: str = ""
    fix_snippet: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["severity"] = self.severity.value
        return d

    def __lt__(self, other: "Finding") -> bool:
        if self.severity.order != other.severity.order:
            return self.severity.order < other.severity.order
        if self.file_path != other.file_path:
            return self.file_path < other.file_path
        return self.line < other.line


@dataclass
class ScanResult:
    target: str
    files_scanned: int = 0
    findings: List[Finding] = field(default_factory=list)
    errors: List[Dict[str, Any]] = field(default_factory=list)
    start_time: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    end_time: Optional[str] = None
    sast_version: str = "0.2.0"

    @property
    def duration_seconds(self) -> float:
        try:
            if self.end_time:
                start = datetime.fromisoformat(self.start_time)
                end = datetime.fromisoformat(self.end_time)
                return (end - start).total_seconds()
        except Exception:
            pass
        return 0.0

    @property
    def summary(self) -> Dict[str, int]:
        s = {sev: 0 for sev in Severity}
        for f in self.findings:
            s[f.severity] += 1
        return {k.value: v for k, v in s.items()}

    def to_dict(self) -> Dict[str, Any]:
        return {
            "target": self.target,
            "sast_version": self.sast_version,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "duration_seconds": self.duration_seconds,
            "files_scanned": self.files_scanned,
            "summary": self.summary,
            "findings": [f.to_dict() for f in sorted(self.findings)],
            "errors": self.errors,
        }
