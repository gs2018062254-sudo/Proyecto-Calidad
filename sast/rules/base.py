from __future__ import annotations

import ast
from abc import ABC, abstractmethod
from typing import List, TYPE_CHECKING

if TYPE_CHECKING:
    from ..models.finding import Finding
    from ..core.parser import ParsedFile


class BaseRule(ABC):
    """Clase base para todas las reglas de detección."""

    rule_id: str = ""
    title: str = ""
    severity: str = "medium"
    description: str = ""
    cwe: str = ""
    owasp: str = ""
    recommendation: str = ""

    def __init__(self):
        if not self.rule_id:
            self.rule_id = self.__class__.__name__

    @abstractmethod
    def check(self, parsed: "ParsedFile") -> List["Finding"]:
        """Ejecuta la regla sobre un archivo parseado y devuelve los findings."""
        raise NotImplementedError

    def _make_finding(
        self,
        parsed: "ParsedFile",
        line: int,
        column: int = 0,
        evidence: str = "",
        confidence: float = 0.8,
        extra: dict | None = None,
    ) -> "Finding":
        from ..models.finding import Finding, Severity

        if not evidence:
            evidence = parsed.get_line(line)

        return Finding(
            rule_id=self.rule_id,
            title=self.title,
            severity=Severity.from_str(self.severity),
            file_path=parsed.file_path,
            line=line,
            column=column,
            description=self.description,
            cwe=self.cwe,
            owasp=self.owasp,
            confidence=confidence,
            evidence=evidence,
            recommendation=self.recommendation,
            metadata=extra or {},
        )
