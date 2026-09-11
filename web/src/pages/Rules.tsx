import { useEffect, useState } from "react";
import { fetchRules } from "../lib/api";
import { SEVERITY_INFO } from "../lib/severity";
import type { RuleDto } from "../types";
import { BookOpen, ShieldAlert, ExternalLink } from "lucide-react";

const FALLBACK_RULES: RuleDto[] = [
  {
    id: "SQL_INJECTION",
    title: "Inyección SQL",
    severity: "critical",
    cwe: "CWE-89",
    owasp: "A03:2021-Injection",
    description:
      "Consulta SQL construida con datos del usuario sin sanitizar ni usar prepared statements.",
    recommendation:
      "Usa consultas parametrizadas con placeholders. Evita concatenar strings para construir SQL.",
  },
  {
    id: "COMMAND_INJECTION",
    title: "Inyección de Comandos",
    severity: "critical",
    cwe: "CWE-78",
    owasp: "A03:2021-Injection",
    description:
      "Entrada del usuario llegando a funciones de ejecución de comandos del SO.",
    recommendation:
      "Usa subprocess con argumentos como lista y shell=False. Valida estrictamente la entrada.",
  },
  {
    id: "PATH_TRAVERSAL",
    title: "Path Traversal",
    severity: "high",
    cwe: "CWE-22",
    owasp: "A01:2021-Broken Access Control",
    description:
      "Rutas de archivo construidas con entrada del usuario sin normalizar.",
    recommendation:
      "Usa os.path.realpath y valida que el resultado esté dentro de un directorio base permitido.",
  },
  {
    id: "XSS",
    title: "Cross-Site Scripting (XSS)",
    severity: "high",
    cwe: "CWE-79",
    owasp: "A03:2021-Injection",
    description:
      "Datos del usuario en renderizado HTML sin escape adecuado.",
    recommendation:
      "Escapa la salida en HTML. Evita render_template_string con datos dinámicos.",
  },
  {
    id: "HARDCODED_SECRET",
    title: "Secreto Hardcodeado",
    severity: "high",
    cwe: "CWE-798",
    owasp: "A7:2021-Identification and Authentication Failures",
    description:
      "Credenciales, API keys, tokens o claves privadas escritas directamente en el código.",
    recommendation:
      "Usa variables de entorno, gestores de secretos (Vault, AWS Secrets Manager) o archivos .env ignorados.",
  },
  {
    id: "DANGEROUS_FUNCTION",
    title: "Uso de Función Peligrosa",
    severity: "high",
    cwe: "CWE-676",
    owasp: "A03:2021-Injection",
    description:
      "Uso de funciones potencialmente inseguras: eval, exec, pickle.loads, yaml.load, etc.",
    recommendation:
      "Evita estas funciones con entrada dinámica. Usa alternativas seguras como ast.literal_eval o yaml.safe_load.",
  },
  {
    id: "WEAK_CRYPTO",
    title: "Criptografía Débil",
    severity: "high",
    cwe: "CWE-327",
    owasp: "A02:2021-Cryptographic Failures",
    description:
      "Algoritmos obsoletos o rotos: MD5, SHA-1, DES, 3DES, RC4, ECB, PRNG no seguro.",
    recommendation:
      "Usa AES-256-GCM, ChaCha20-Poly1305, SHA-256/512 y secrets para valores aleatorios.",
  },
  {
    id: "INSECURE_PASSWORD_HASH",
    title: "Hash de Contraseña Inseguro",
    severity: "high",
    cwe: "CWE-916",
    owasp: "A02:2021-Cryptographic Failures",
    description:
      "Contraseñas hasheadas con funciones generales (MD5/SHA) sin sal ni adaptación.",
    recommendation:
      "Usa bcrypt, Argon2 o PBKDF2-HMAC-SHA256 con alto costo y sal única.",
  },
];

export default function Rules() {
  const [rules, setRules] = useState<RuleDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetchRules()
      .then((r) => {
        if (mounted && r.length) setRules(r);
        else if (mounted) setRules(FALLBACK_RULES);
      })
      .catch(() => mounted && setRules(FALLBACK_RULES))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const display = rules.length ? rules : FALLBACK_RULES;

  return (
    <div className="max-w-[1280px] mx-auto py-4 space-y-8">
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-blue-950/60 border border-blue-800/60 px-3.5 py-1 text-xs text-blue-400 font-mono">
          <BookOpen size={14} className="text-blue-400" />
          <span>CATÁLOGO DE REGLAS DE DETECCIÓN</span>
        </div>
        <h1 className="font-display font-extrabold text-3xl md:text-4xl tracking-tight text-white">
          Reglas de Seguridad Estática (SAST)
        </h1>
        <p className="text-sm text-slate-400 leading-relaxed">
          {display.length} reglas activas cubriendo OWASP Top 10, mitigación de vulnerabilidades CWE y
          análisis de flujo de datos en Python.
        </p>
      </div>

      {loading && !rules.length ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="card bg-[#0a0f1d] border border-slate-800 p-5 h-48 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {display.map((r) => {
            const sevKey =
              (r.severity?.toLowerCase() as keyof typeof SEVERITY_INFO) ||
              "info";
            const sev =
              SEVERITY_INFO[sevKey] || SEVERITY_INFO.info;
            return (
              <div
                key={r.id}
                className="card bg-[#0a0f1d] border border-slate-800/90 p-5 relative overflow-hidden transition-all hover:border-slate-700"
                style={{
                  borderLeftWidth: 4,
                  borderLeftColor: sev.color,
                }}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="chip !py-0.5 text-[11px]"
                        style={{
                          background: `${sev.color}18`,
                          color: sev.color,
                          borderColor: `${sev.color}40`,
                        }}
                      >
                        {sev.emoji} {sev.labelEs}
                      </span>
                      <span className="font-mono text-[11px] text-slate-500 font-medium">
                        {r.id}
                      </span>
                    </div>
                    <h3 className="font-display font-semibold text-[17px] text-white mt-2">
                      {r.title}
                    </h3>
                  </div>
                  <div
                    className="w-9 h-9 rounded-xl grid place-items-center shrink-0"
                    style={{ background: `${sev.color}15`, color: sev.color }}
                  >
                    <ShieldAlert size={18} />
                  </div>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {r.description}
                </p>
                <div className="flex flex-wrap gap-2 mt-4 font-mono text-xs">
                  {r.cwe && (
                    <a
                      href={`https://cwe.mitre.org/data/definitions/${r.cwe.replace(
                        "CWE-",
                        "",
                      )}.html`}
                      target="_blank"
                      rel="noreferrer"
                      className="chip chip-gray hover:text-blue-400 hover:border-blue-500/40"
                    >
                      {r.cwe} <ExternalLink size={10} />
                    </a>
                  )}
                  {r.owasp && (
                    <span className="chip chip-purple !py-0.5">
                      OWASP {r.owasp.split("-")[0]}
                    </span>
                  )}
                </div>
                {r.recommendation && (
                  <div className="mt-4 rounded-xl bg-[#070a12] border border-slate-800 p-3">
                    <div className="text-[10px] uppercase font-mono tracking-wider text-emerald-400 font-semibold mb-1">
                      Recomendación
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      💡 {r.recommendation}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
