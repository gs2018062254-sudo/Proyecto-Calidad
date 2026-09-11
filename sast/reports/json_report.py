from __future__ import annotations

import json
from pathlib import Path
from typing import Optional, Union, TextIO

from ..models.finding import ScanResult


class JsonReporter:
    """Genera reportes en formato JSON (estándar + compatible con SARIF lite)."""

    def generate(
        self,
        result: ScanResult,
        output_path: Optional[str] = None,
        indent: int = 2,
    ) -> str:
        data = result.to_dict()
        text = json.dumps(data, indent=indent, ensure_ascii=False)
        if output_path:
            p = Path(output_path)
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text(text, encoding="utf-8")
        return text

    def to_sarif(self, result: ScanResult) -> dict:
        """Genera un diccionario compatible con SARIF 2.1.0."""
        rules_registry = {}
        for f in result.findings:
            if f.rule_id not in rules_registry:
                rules_registry[f.rule_id] = {
                    "id": f.rule_id,
                    "name": f.title,
                    "shortDescription": {"text": f.title},
                    "fullDescription": {"text": f.description or f.title},
                    "defaultConfiguration": {
                        "level": self._severity_to_sarif_level(f.severity.value),
                    },
                    "helpUri": f"https://cwe.mitre.org/data/definitions/{f.cwe[4:]}.html" if f.cwe and f.cwe.startswith("CWE-") else "",
                    "properties": {
                        "tags": [t for t in [f.cwe, f.owasp] if t],
                    },
                }

        results = []
        for f in result.findings:
            results.append({
                "ruleId": f.rule_id,
                "ruleIndex": list(rules_registry.keys()).index(f.rule_id) if f.rule_id in rules_registry else 0,
                "level": self._severity_to_sarif_level(f.severity.value),
                "message": {
                    "text": f"{f.title}\n\n{f.description}",
                },
                "locations": [
                    {
                        "physicalLocation": {
                            "artifactLocation": {
                                "uri": f.file_path,
                            },
                            "region": {
                                "startLine": f.line,
                                "startColumn": max(1, f.column),
                                **({"endLine": f.end_line} if f.end_line else {}),
                                **({"snippet": {"text": f.evidence}} if f.evidence else {}),
                            },
                        },
                    },
                ],
                "partialFingerprints": {
                    "confidence": str(f.confidence),
                },
                "properties": {
                    "owasp": f.owasp,
                    "cwe": f.cwe,
                    "confidence": f.confidence,
                    "data_flow": f.data_flow,
                    "recommendation": f.recommendation,
                },
            })

        return {
            "$schema": "https://schemastore.azurewebsites.net/schemas/json/sarif-2.1.0-rtm.5.json",
            "version": "2.1.0",
            "runs": [
                {
                    "tool": {
                        "driver": {
                            "name": "SAST Analyzer",
                            "version": result.sast_version,
                            "informationUri": "",
                            "rules": list(rules_registry.values()),
                        },
                    },
                    "invocations": [
                        {
                            "executionSuccessful": True,
                            "startTimeUtc": result.start_time,
                            "endTimeUtc": result.end_time,
                        },
                    ],
                    "results": results,
                    "columnKind": "utf16CodeUnits",
                },
            ],
        }

    def generate_sarif(self, result: ScanResult, output_path: Optional[str] = None) -> str:
        data = self.to_sarif(result)
        text = json.dumps(data, indent=2, ensure_ascii=False)
        if output_path:
            p = Path(output_path)
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text(text, encoding="utf-8")
        return text

    @staticmethod
    def _severity_to_sarif_level(sev: str) -> str:
        mapping = {
            "critical": "error",
            "high": "error",
            "medium": "warning",
            "low": "note",
            "info": "note",
        }
        return mapping.get(sev, "note")
