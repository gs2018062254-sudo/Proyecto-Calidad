from __future__ import annotations

import json
import sys
from typing import TextIO, Optional

from ..models.finding import ScanResult, Severity


class ConsoleReporter:
    """Genera reportes formateados para consola con colores y emojis."""

    COLORS = {
        Severity.CRITICAL: "\033[91m",
        Severity.HIGH: "\033[38;5;208m",
        Severity.MEDIUM: "\033[93m",
        Severity.LOW: "\033[92m",
        Severity.INFO: "\033[94m",
    }
    RESET = "\033[0m"
    BOLD = "\033[1m"
    DIM = "\033[2m"

    def __init__(self, use_colors: Optional[bool] = None):
        if use_colors is None:
            self.use_colors = sys.stdout.isatty()
        else:
            self.use_colors = use_colors

    def _c(self, severity: Severity, text: str) -> str:
        if not self.use_colors:
            return text
        return f"{self.COLORS.get(severity, '')}{text}{self.RESET}"

    def _bold(self, text: str) -> str:
        if not self.use_colors:
            return text
        return f"{self.BOLD}{text}{self.RESET}"

    def generate(self, result: ScanResult, output: Optional[TextIO] = None, verbose: bool = False) -> str:
        out = output if output is not None else sys.stdout
        lines: list[str] = []

        lines.append("")
        lines.append(self._bold("═" * 70))
        lines.append(self._bold("  🛡️  SAST SECURITY REPORT"))
        lines.append(self._bold("═" * 70))
        lines.append(f"  Objetivo      : {result.target}")
        lines.append(f"  Versión SAST  : {result.sast_version}")
        lines.append(f"  Archivos      : {result.files_scanned}")
        if result.duration_seconds:
            lines.append(f"  Duración      : {result.duration_seconds:.2f}s")
        lines.append("")

        summary = result.summary
        total = sum(summary.values())
        sev_order = ["critical", "high", "medium", "low", "info"]
        labels = {"critical": "CRÍTICO", "high": "ALTO", "medium": "MEDIO", "low": "BAJO", "info": "INFO"}

        lines.append(self._bold("  📊 RESUMEN DE VULNERABILIDADES"))
        lines.append("  " + "─" * 40)
        for sev in sev_order:
            count = summary.get(sev, 0)
            s = Severity.from_str(sev)
            emoji = s.emoji
            count_str = self._c(s, str(count).rjust(5))
            pct = f"({count*100//total:>3}%)" if total else "(  0%)"
            lines.append(f"    {emoji} {labels[sev]:<8} {count_str} {pct}")
        lines.append("  " + "─" * 40)
        lines.append(self._bold(f"    TOTAL{'':<9} {str(total).rjust(5)}"))
        lines.append("")

        if not result.findings:
            lines.append(self._bold("  ✅ No se encontraron vulnerabilidades."))
            lines.append("")
        else:
            lines.append(self._bold(f"  🔍 DETALLE DE FINDINGS ({len(result.findings)})"))
            lines.append(self._bold("  " + "═" * 68))

            current_severity = None
            for finding in result.findings:
                if finding.severity != current_severity:
                    current_severity = finding.severity
                    lines.append("")
                    lines.append(self._c(
                        finding.severity,
                        f"  {finding.severity.emoji} "
                        f"{labels[finding.severity.value]} "
                        f"{'─' * (55 - len(labels[finding.severity.value]))}",
                    ))

                conf_pct = int(finding.confidence * 100)
                sev_tag = self._c(finding.severity, f"[{labels[finding.severity.value].upper()}]")

                lines.append(f"  {sev_tag} {self._bold(finding.title)}")
                lines.append(f"     📄 Archivo    : {finding.file_path}:{finding.line}")
                if finding.cwe:
                    lines.append(f"     🏷️  CWE        : {finding.cwe}")
                if finding.owasp:
                    lines.append(f"     🛡️  OWASP      : {finding.owasp}")
                lines.append(f"     🎯 Confianza  : {self._confidence_bar(finding.confidence)} {conf_pct}%")
                if finding.description:
                    lines.append(f"     📝 Descripción: {finding.description}")
                if finding.evidence:
                    lines.append(f"     💻 Evidencia  : {self._format_evidence(finding.evidence)}")
                if verbose and finding.data_flow:
                    lines.append(f"     🔀 Data Flow:")
                    for step in finding.data_flow:
                        var = step.get("variable", "?")
                        ln = step.get("line", "?")
                        i = step.get("step", "?")
                        lines.append(f"         [{i}] L{ln}: {var}")
                if verbose and finding.recommendation:
                    lines.append(f"     💡 Recomendación: {finding.recommendation}")
                lines.append("")

        if result.errors:
            lines.append(self._bold("  ⚠️  ERRORES") + f" ({len(result.errors)})")
            lines.append("  " + "─" * 40)
            for err in result.errors[:10]:
                lines.append(f"    • {err.get('file','?')}: {err.get('error','?')}")
            if len(result.errors) > 10:
                lines.append(f"    ... y {len(result.errors)-10} más")
            lines.append("")

        lines.append(self._bold("═" * 70))
        text = "\n".join(lines) + "\n"

        if output is None:
            print(text, end="")
        else:
            out.write(text)
        return text

    def _confidence_bar(self, confidence: float) -> str:
        n = max(1, min(10, int(confidence * 10)))
        filled = "█" * n
        empty = "░" * (10 - n)
        if confidence >= 0.9:
            color = Severity.CRITICAL
        elif confidence >= 0.75:
            color = Severity.HIGH
        elif confidence >= 0.5:
            color = Severity.MEDIUM
        else:
            color = Severity.LOW
        return self._c(color, filled) + (empty if self.use_colors else empty)

    def _format_evidence(self, evidence: str) -> str:
        line = evidence.strip()
        if len(line) > 100:
            line = line[:97] + "..."
        if self.use_colors:
            return f"\033[3m{self.DIM}{line}{self.RESET}"
        return line
