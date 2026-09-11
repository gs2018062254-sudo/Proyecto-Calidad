from __future__ import annotations

import os
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Iterable, Dict, Any, Type

from ..models.finding import Finding, ScanResult
from ..core.parser import PythonParser, ParsedFile, detect_language
from .base import BaseRule
from .basic_rules import HardcodedSecretRule, DangerousFunctionRule
from .injection_rules import (
    SQLInjectionRule,
    CommandInjectionRule,
    PathTraversalRule,
    XSSRule,
)
from .crypto_rules import WeakCryptographyRule, InsecureHashPasswordRule


DEFAULT_RULES: List[Type[BaseRule]] = [
    HardcodedSecretRule,
    DangerousFunctionRule,
    SQLInjectionRule,
    CommandInjectionRule,
    PathTraversalRule,
    XSSRule,
    WeakCryptographyRule,
    InsecureHashPasswordRule,
]

PYTHON_EXTENSIONS = {".py", ".pyw"}


@dataclass
class AnalyzerConfig:
    excluded_dirs: List[str] = field(default_factory=lambda: [
        "__pycache__", ".git", ".svn", ".hg", "venv", "env", ".venv",
        ".env", "node_modules", "dist", "build", ".tox", ".eggs",
        "*.egg-info", ".pytest_cache", ".mypy_cache",
    ])
    excluded_extensions: List[str] = field(default_factory=lambda: [
        ".pyc", ".pyo", ".pyd", ".so", ".dll", ".exe", ".bin",
    ])
    excluded_files: List[str] = field(default_factory=lambda: [
        "setup.py", "conftest.py", "__init__.py",
    ])
    excluded_patterns: List[str] = field(default_factory=lambda: [
        "test_*.py", "*_test.py", "tests/**", "migrations/**",
    ])
    exclude_tests: bool = True
    max_file_size_kb: int = 512
    min_confidence: float = 0.0


class AnalyzerEngine:
    """Motor principal del analizador SAST."""

    def __init__(
        self,
        rules: Optional[Iterable[Type[BaseRule]]] = None,
        config: Optional[AnalyzerConfig] = None,
    ):
        self.config = config or AnalyzerConfig()
        self.rules: List[BaseRule] = []
        self._init_rules(rules)
        self.parser = PythonParser()

    def _init_rules(self, rules: Optional[Iterable[Type[BaseRule]]]) -> None:
        rule_classes = list(rules) if rules is not None else DEFAULT_RULES
        for cls in rule_classes:
            try:
                self.rules.append(cls())
            except Exception:
                continue

    def scan(self, target: str) -> ScanResult:
        """Escanea un archivo o directorio."""
        result = ScanResult(target=target)
        files = self._collect_files(target)
        result.files_scanned = 0

        for file_path in files:
            try:
                findings = self.scan_file(file_path)
                if findings is not None:
                    result.files_scanned += 1
                    result.findings.extend(findings)
            except Exception as e:
                result.errors.append({
                    "file": str(file_path),
                    "error": str(e),
                    "type": type(e).__name__,
                })

        result.end_time = datetime.utcnow().isoformat()
        result.findings = [
            f for f in result.findings
            if f.confidence >= self.config.min_confidence
        ]
        result.findings.sort()
        return result

    def scan_file(self, file_path: str) -> Optional[List[Finding]]:
        """Escanea un único archivo."""
        p = Path(file_path)
        if not p.exists() or not p.is_file():
            return None

        if self.config.max_file_size_kb > 0:
            size_kb = p.stat().st_size / 1024
            if size_kb > self.config.max_file_size_kb:
                return None

        lang = detect_language(file_path)
        if lang != "python":
            return None

        parsed = self.parser.parse_file(file_path)
        if parsed is None:
            return None

        all_findings: List[Finding] = []
        for rule in self.rules:
            try:
                rule_findings = rule.check(parsed)
                all_findings.extend(rule_findings)
            except Exception:
                continue
        return all_findings

    def scan_source(self, source: str, file_path: str = "<string>") -> List[Finding]:
        """Escanea código fuente pasado como string."""
        parsed = self.parser.parse_source(source, file_path)
        if parsed is None:
            return []
        all_findings: List[Finding] = []
        for rule in self.rules:
            try:
                rule_findings = rule.check(parsed)
                all_findings.extend(rule_findings)
            except Exception:
                continue
        all_findings = [
            f for f in all_findings
            if f.confidence >= self.config.min_confidence
        ]
        all_findings.sort()
        return all_findings

    def _collect_files(self, target: str) -> List[str]:
        """Recolecta archivos Python de un target (archivo o directorio)."""
        path = Path(target)
        if path.is_file():
            return [str(path)] if path.suffix.lower() in PYTHON_EXTENSIONS else []

        if not path.is_dir():
            return []

        collected: List[str] = []
        excluded_dirs = set(self.config.excluded_dirs)
        excluded_exts = set(self.config.excluded_extensions)

        for root, dirs, files in os.walk(str(path)):
            dirs[:] = [d for d in dirs if d not in excluded_dirs]
            for fname in files:
                full = os.path.join(root, fname)
                ext = Path(fname).suffix.lower()
                if ext in excluded_exts:
                    continue
                if ext not in PYTHON_EXTENSIONS:
                    continue
                if self._should_exclude_file(full, fname, path):
                    continue
                collected.append(full)

        return sorted(collected)

    def _should_exclude_file(self, full: str, fname: str, base: Path) -> bool:
        import fnmatch
        rel = str(Path(full).relative_to(base)) if str(full).startswith(str(base)) else fname

        for pattern in self.config.excluded_patterns:
            if self.config.exclude_tests and ("tests" in rel.replace("\\", "/").split("/") or fname.startswith("test_") or fname.endswith("_test.py")):
                return True
            if fnmatch.fnmatch(rel, pattern) or fnmatch.fnmatch(fname, pattern):
                return True

        if fname in self.config.excluded_files:
            return True
        return False

    def add_rule(self, rule: BaseRule) -> None:
        """Añade una regla personalizada al motor."""
        self.rules.append(rule)

    def list_rules(self) -> List[Dict[str, Any]]:
        """Devuelve información de las reglas activas."""
        info = []
        for rule in self.rules:
            info.append({
                "id": rule.rule_id,
                "title": rule.title,
                "severity": rule.severity,
                "cwe": rule.cwe,
                "description": rule.description[:100] + ("..." if len(rule.description) > 100 else ""),
            })
        return info
