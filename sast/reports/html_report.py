from __future__ import annotations

import html
import json
import base64
from pathlib import Path
from typing import Optional, Dict, List
from datetime import datetime, timezone

from ..models.finding import ScanResult, Severity


HTML_TEMPLATE = r"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>SAST Security Report - {{ target }}</title>
<style>
  :root {
    --bg: #0f172a;
    --surface: #1e293b;
    --surface-2: #334155;
    --border: #475569;
    --text: #e2e8f0;
    --text-dim: #94a3b8;
    --critical: #ef4444;
    --critical-bg: rgba(239,68,68,0.15);
    --high: #f97316;
    --high-bg: rgba(249,115,22,0.15);
    --medium: #eab308;
    --medium-bg: rgba(234,179,8,0.15);
    --low: #22c55e;
    --low-bg: rgba(34,197,94,0.15);
    --info: #3b82f6;
    --info-bg: rgba(59,130,246,0.15);
    --accent: #6366f1;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.5;
    padding: 24px;
  }
  .container { max-width: 1200px; margin: 0 auto; }
  .header {
    background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 32px;
    margin-bottom: 24px;
  }
  .header-top { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
  .shield {
    width: 56px; height: 56px;
    background: var(--accent);
    border-radius: 14px;
    display: flex; align-items: center; justify-content: center;
    font-size: 28px;
  }
  .header h1 { font-size: 28px; font-weight: 800; }
  .header .subtitle { color: var(--text-dim); margin-top: 4px; }
  .meta-grid {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 16px; margin-top: 20px;
  }
  .meta-card {
    background: rgba(255,255,255,0.04);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 14px 18px;
  }
  .meta-card .label { font-size: 11px; text-transform: uppercase; color: var(--text-dim); letter-spacing: 0.5px; }
  .meta-card .value { font-size: 18px; font-weight: 700; margin-top: 4px; }

  .summary {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 24px;
    margin-bottom: 24px;
  }
  .summary h2 { margin-bottom: 20px; font-size: 18px; }
  .summary-grid {
    display: grid; grid-template-columns: repeat(5, 1fr);
    gap: 12px; margin-bottom: 20px;
  }
  @media (max-width: 700px) { .summary-grid { grid-template-columns: repeat(2, 1fr); } }
  .sev-card {
    border-radius: 12px;
    padding: 16px;
    text-align: center;
    border: 1px solid transparent;
  }
  .sev-card.critical { background: var(--critical-bg); border-color: var(--critical); }
  .sev-card.high { background: var(--high-bg); border-color: var(--high); }
  .sev-card.medium { background: var(--medium-bg); border-color: var(--medium); }
  .sev-card.low { background: var(--low-bg); border-color: var(--low); }
  .sev-card.info { background: var(--info-bg); border-color: var(--info); }
  .sev-card .count { font-size: 32px; font-weight: 800; }
  .sev-card .label { font-size: 12px; text-transform: uppercase; opacity: 0.8; margin-top: 4px; }

  .filters {
    display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px;
    padding-top: 16px; border-top: 1px solid var(--border);
  }
  .filter-btn {
    background: var(--surface-2);
    border: 1px solid var(--border);
    color: var(--text);
    padding: 6px 14px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 13px;
    transition: all 0.15s;
  }
  .filter-btn:hover { background: var(--border); }
  .filter-btn.active { background: var(--accent); border-color: var(--accent); }

  .findings { }
  .findings h2 { margin-bottom: 20px; font-size: 18px; }

  .finding {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 14px;
    margin-bottom: 14px;
    overflow: hidden;
    transition: all 0.15s;
  }
  .finding:hover { border-color: var(--accent); }
  .finding-header {
    padding: 16px 20px;
    cursor: pointer;
    display: flex; align-items: center; gap: 14px;
  }
  .finding-sev {
    width: 48px; height: 48px;
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    font-size: 22px;
    flex-shrink: 0;
  }
  .finding-sev.critical { background: var(--critical-bg); }
  .finding-sev.high { background: var(--high-bg); }
  .finding-sev.medium { background: var(--medium-bg); }
  .finding-sev.low { background: var(--low-bg); }
  .finding-sev.info { background: var(--info-bg); }

  .finding-main { flex: 1; min-width: 0; }
  .finding-title { font-weight: 700; font-size: 15px; margin-bottom: 4px; }
  .finding-meta {
    display: flex; flex-wrap: wrap; gap: 8px;
    font-size: 12px; color: var(--text-dim);
  }
  .badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 600;
    background: var(--surface-2);
  }
  .badge.sev-critical { background: var(--critical-bg); color: var(--critical); }
  .badge.sev-high { background: var(--high-bg); color: var(--high); }
  .badge.sev-medium { background: var(--medium-bg); color: var(--medium); }
  .badge.sev-low { background: var(--low-bg); color: var(--low); }
  .badge.sev-info { background: var(--info-bg); color: var(--info); }
  .badge.rule { background: var(--info-bg); color: var(--info); }

  .confidence-bar {
    width: 80px; height: 6px;
    background: var(--surface-2);
    border-radius: 3px;
    overflow: hidden;
    margin-left: auto;
    flex-shrink: 0;
  }
  .confidence-fill { height: 100%; border-radius: 3px; }

  .toggle { color: var(--text-dim); font-size: 18px; transition: transform 0.2s; }
  .finding.open .toggle { transform: rotate(90deg); }

  .finding-body {
    display: none;
    padding: 0 20px 20px 82px;
  }
  .finding.open .finding-body { display: block; }
  .finding-body h4 {
    font-size: 13px; color: var(--text-dim); text-transform: uppercase;
    letter-spacing: 0.5px; margin: 14px 0 8px;
  }
  .finding-body h4:first-child { margin-top: 0; }
  .finding-body p { font-size: 14px; color: var(--text); margin-bottom: 8px; }
  pre.code {
    background: #0b1120;
    border: 1px solid var(--border);
    border-left: 3px solid var(--accent);
    border-radius: 8px;
    padding: 12px 14px;
    font-family: ui-monospace, "SF Mono", Consolas, monospace;
    font-size: 12px;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-all;
    color: #cbd5e1;
  }
  .dataflow-list {
    list-style: none;
    padding-left: 0;
  }
  .dataflow-list li {
    padding: 8px 12px;
    margin-bottom: 6px;
    background: rgba(255,255,255,0.03);
    border-left: 2px solid var(--accent);
    border-radius: 4px;
    font-family: ui-monospace, monospace;
    font-size: 13px;
  }
  .recommendation-box {
    background: rgba(99,102,241,0.1);
    border: 1px solid var(--accent);
    border-radius: 8px;
    padding: 12px 16px;
    font-size: 14px;
  }
  .recommendation-box::before {
    content: "💡 ";
    font-weight: 700;
  }

  .footer {
    text-align: center;
    color: var(--text-dim);
    font-size: 12px;
    padding: 32px 0 8px;
  }
</style>
</head>
<body>
<div class="container">

  <div class="header">
    <div class="header-top">
      <div class="shield">🛡️</div>
      <div>
        <h1>Informe de Seguridad SAST</h1>
        <div class="subtitle">Análisis Estático de Código Fuente</div>
      </div>
    </div>
    <div class="meta-grid">
      <div class="meta-card"><div class="label">Objetivo</div><div class="value" title="{{ target }}">{{ target_short }}</div></div>
      <div class="meta-card"><div class="label">Versión SAST</div><div class="value">{{ sast_version }}</div></div>
      <div class="meta-card"><div class="label">Archivos Analizados</div><div class="value">{{ files_scanned }}</div></div>
      <div class="meta-card"><div class="label">Duración</div><div class="value">{{ duration }}s</div></div>
      <div class="meta-card"><div class="label">Fecha</div><div class="value" style="font-size:14px">{{ generated_at }}</div></div>
    </div>
  </div>

  <div class="summary">
    <h2>📊 Resumen de Vulnerabilidades</h2>
    <div class="summary-grid">
      <div class="sev-card critical"><div class="count">{{ summary_critical }}</div><div class="label">Crítico</div></div>
      <div class="sev-card high"><div class="count">{{ summary_high }}</div><div class="label">Alto</div></div>
      <div class="sev-card medium"><div class="count">{{ summary_medium }}</div><div class="label">Medio</div></div>
      <div class="sev-card low"><div class="count">{{ summary_low }}</div><div class="label">Bajo</div></div>
      <div class="sev-card info"><div class="count">{{ summary_info }}</div><div class="label">Info</div></div>
    </div>
    <div class="filters">
      <span style="font-size:13px;color:var(--text-dim);align-self:center;margin-right:4px">Filtrar:</span>
      <button class="filter-btn active" onclick="filterFindings('all')">Todas ({{ total_findings }})</button>
      <button class="filter-btn" onclick="filterFindings('critical')">🔴 Crítico ({{ summary_critical }})</button>
      <button class="filter-btn" onclick="filterFindings('high')">🟠 Alto ({{ summary_high }})</button>
      <button class="filter-btn" onclick="filterFindings('medium')">🟡 Medio ({{ summary_medium }})</button>
      <button class="filter-btn" onclick="filterFindings('low')">🟢 Bajo ({{ summary_low }})</button>
      <button class="filter-btn" onclick="filterFindings('info')">🔵 Info ({{ summary_info }})</button>
    </div>
  </div>

  <div class="findings">
    <h2>🔍 Hallazgos de Seguridad</h2>
    {% if total_findings == 0 %}
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:48px;text-align:center;">
      <div style="font-size:56px;margin-bottom:16px;">✅</div>
      <div style="font-size:20px;font-weight:700;margin-bottom:8px;">No se encontraron vulnerabilidades</div>
      <div style="color:var(--text-dim);">Buen trabajo! Sigue practicando código seguro.</div>
    </div>
    {% else %}
    {{ findings_html }}
    {% endif %}
  </div>

  <div class="footer">
    Generado por SAST Analyzer v{{ sast_version }} • {{ generated_at }}
  </div>
</div>

<script>
function toggleFinding(id) {
  const el = document.getElementById('finding-' + id);
  if (el) el.classList.toggle('open');
}
function filterFindings(severity) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  document.querySelectorAll('.finding').forEach(el => {
    if (severity === 'all' || el.dataset.severity === severity) {
      el.style.display = '';
    } else {
      el.style.display = 'none';
    }
  });
}
</script>
</body>
</html>"""


class HtmlReporter:
    """Genera reportes HTML interactivos."""

    SEV_EMOJI = {
        Severity.CRITICAL: "🔴",
        Severity.HIGH: "🟠",
        Severity.MEDIUM: "🟡",
        Severity.LOW: "🟢",
        Severity.INFO: "🔵",
    }

    SEV_COLOR = {
        Severity.CRITICAL: "critical",
        Severity.HIGH: "high",
        Severity.MEDIUM: "medium",
        Severity.LOW: "low",
        Severity.INFO: "info",
    }

    SEV_BAR_COLOR = {
        Severity.CRITICAL: "#ef4444",
        Severity.HIGH: "#f97316",
        Severity.MEDIUM: "#eab308",
        Severity.LOW: "#22c55e",
        Severity.INFO: "#3b82f6",
    }

    def generate(self, result: ScanResult, output_path: Optional[str] = None) -> str:
        try:
            from jinja2 import Template
            template = Template(HTML_TEMPLATE)
        except ImportError:
            template = None

        summary = result.summary
        target_short = result.target
        if len(target_short) > 45:
            target_short = "..." + target_short[-42:]

        findings_html = self._render_findings(result)
        total_findings = len(result.findings)

        context = {
            "target": html.escape(result.target),
            "target_short": html.escape(target_short),
            "sast_version": result.sast_version,
            "files_scanned": result.files_scanned,
            "duration": f"{result.duration_seconds:.2f}",
            "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
            "summary_critical": summary.get("critical", 0),
            "summary_high": summary.get("high", 0),
            "summary_medium": summary.get("medium", 0),
            "summary_low": summary.get("low", 0),
            "summary_info": summary.get("info", 0),
            "total_findings": total_findings,
            "findings_html": findings_html,
        }

        if template:
            html_text = template.render(**context)
        else:
            html_text = self._manual_render(context, findings_html)

        if output_path:
            p = Path(output_path)
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text(html_text, encoding="utf-8")
        return html_text

    def _render_findings(self, result: ScanResult) -> str:
        parts = []
        for i, f in enumerate(result.findings):
            sev = f.severity
            sev_cls = self.SEV_COLOR[sev]
            emoji = self.SEV_EMOJI[sev]
            conf_pct = int(f.confidence * 100)
            bar_color = self.SEV_BAR_COLOR[sev] if f.confidence < 0.75 else (
                self.SEV_BAR_COLOR[Severity.HIGH] if f.confidence < 0.9 else self.SEV_BAR_COLOR[Severity.CRITICAL]
            )

            location = html.escape(f"{f.file_path}:{f.line}")
            badges = [
                f'<span class="badge sev-{sev_cls}">{sev.value.upper()}</span>',
                f'<span class="badge rule">{html.escape(f.rule_id)}</span>',
            ]
            if f.cwe:
                cwe_link = f"https://cwe.mitre.org/data/definitions/{f.cwe[4:]}.html" if f.cwe.startswith("CWE-") else "#"
                badges.append(f'<a href="{cwe_link}" target="_blank" style="text-decoration:none"><span class="badge">{html.escape(f.cwe)}</span></a>')

            badges_html = " ".join(badges)
            meta_parts = [f"📄 {location}"]
            if f.owasp:
                meta_parts.append(f"🛡️ {html.escape(f.owasp)}")
            meta_html = " &nbsp;•&nbsp; ".join(meta_parts)

            body_parts = []
            if f.description:
                body_parts.append(f"<h4>Descripción</h4><p>{html.escape(f.description)}</p>")
            if f.evidence:
                body_parts.append(f"<h4>Evidencia (línea {f.line})</h4><pre class=\"code\">{html.escape(f.evidence)}</pre>")
            if f.data_flow:
                items = []
                for step in f.data_flow:
                    step_num = step.get("step", "?")
                    ln = step.get("line", "?")
                    var = html.escape(str(step.get("variable", "?")))
                    items.append(f"<li>[{step_num}] Línea {ln} → <strong>{var}</strong></li>")
                body_parts.append(f"<h4>🔀 Flujo de Datos (Taint)</h4><ul class=\"dataflow-list\">{''.join(items)}</ul>")
            if f.recommendation:
                body_parts.append(f"<h4>Recomendación</h4><div class=\"recommendation-box\">{html.escape(f.recommendation)}</div>")
            if getattr(f, "fix_snippet", ""):
                body_parts.append(f"<h4>Código Seguro Sugerido</h4><pre class=\"code\">{html.escape(f.fix_snippet)}</pre>")

            body_html = "".join(body_parts)
            parts.append(f"""
  <div class="finding" data-severity="{sev.value}" id="finding-{i}" onclick="event.target.tagName !== 'A' && event.target.tagName !== 'BUTTON' && toggleFinding({i})">
    <div class="finding-header">
      <div class="finding-sev {sev_cls}">{emoji}</div>
      <div class="finding-main">
        <div class="finding-title">{html.escape(f.title)}</div>
        <div class="finding-meta">
          {badges_html}
          <span>{meta_html}</span>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="font-size:12px;color:var(--text-dim);font-weight:600;">{conf_pct}%</div>
        <div class="confidence-bar"><div class="confidence-fill" style="width:{conf_pct}%;background:{bar_color};"></div></div>
        <span class="toggle">▶</span>
      </div>
    </div>
    <div class="finding-body">{body_html}</div>
  </div>
""")
        return "".join(parts)

    def _manual_render(self, context: dict, findings_html: str) -> str:
        """Fallback sin Jinja2."""
        tpl = HTML_TEMPLATE
        for key, value in context.items():
            if isinstance(value, int):
                tpl = tpl.replace("{{ " + key + " }}", str(value))
            else:
                tpl = tpl.replace("{{ " + key + " }}", str(value))
        if findings_html:
            tpl = tpl.replace("{{ findings_html }}", findings_html)
        else:
            tpl = tpl.replace("{{ findings_html }}", "")
        return tpl
