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
  {
    id: "SSRF",
    title: "Server-Side Request Forgery (SSRF)",
    severity: "high",
    cwe: "CWE-918",
    owasp: "A10:2021-Server-Side Request Forgery",
    description:
      "Peticiones HTTP salientes cuya URL proviene de entrada del usuario sin validar contra una allowlist.",
    recommendation:
      "Valida las URLs contra una lista blanca de dominios permitidos y bloquea IPs privadas/loopback.",
  },
  {
    id: "INSECURE_DESERIALIZATION",
    title: "Deserialización Insegura",
    severity: "critical",
    cwe: "CWE-502",
    owasp: "A08:2021-Software and Data Integrity Failures",
    description:
      "Deserialización de objetos binarios o YAML (pickle, marshal, yaml.load) susceptible a ejecución remota de código.",
    recommendation:
      "Usa json.loads() o yaml.safe_load() con SafeLoader.",
  },
  {
    id: "SECURITY_MISCONFIGURATION",
    title: "Configuración de Seguridad Incorrecta (SSL / Debug / CORS)",
    severity: "high",
    cwe: "CWE-295",
    owasp: "A05:2021-Security Misconfiguration",
    description:
      "Desactivación de validación de certificados TLS (verify=False) o modo debug=True activo en producción.",
    recommendation:
      "Mantén siempre verify=True en peticiones HTTPS y desactiva debug=True en producción.",
  },
  {
    id: "JWT_WEAKNESS",
    title: "Validación Insegura de Token JWT",
    severity: "high",
    cwe: "CWE-347",
    owasp: "A07:2021-Identification and Authentication Failures",
    description:
      "Decodificación de tokens JWT deshabilitando verify_signature o permitiendo el algoritmo 'none'.",
    recommendation:
      "Especifica algoritmos explícitos (HS256/RS256) y mantén verify_signature=True.",
  },
];

const SEV_CLASS: Record<string, string> = {
  critical: "studio-sev-critical",
  high: "studio-sev-high",
  medium: "studio-sev-medium",
  low: "studio-sev-low",
  info: "studio-sev-info",
};

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
    <div className="max-w-[1300px] mx-auto space-y-6">
      {/* Header */}
      <section className="studio-console-header">
        <div className="studio-title-group">
          <h1>Reglas de Seguridad (SAST)</h1>
          <p>
            {display.length} reglas activas cubriendo mitigación de vulnerabilidades OWASP Top 10,
            debilidades CWE y análisis de flujo de datos (Taint Flow) multilenguaje.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="studio-badge text-blue-400">
            <BookOpen size={13} /> {display.length} reglas activas
          </span>
        </div>
      </section>

      {/* Rules Grid */}
      {loading && !rules.length ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="p-5 rounded-[var(--radius-md)] border border-[var(--studio-border)] bg-[var(--studio-panel)] h-44 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {display.map((r) => {
            const sevKey = (r.severity?.toLowerCase() || "info") as keyof typeof SEVERITY_INFO;
            const sev = SEVERITY_INFO[sevKey] || SEVERITY_INFO.info;
            const owaspTag = r.owasp ? r.owasp.split("-")[0] : null;

            return (
              <div
                key={r.id}
                className="p-4 rounded-[var(--radius-md)] border border-[var(--studio-border)] bg-[var(--studio-panel)] relative overflow-hidden transition-colors hover:border-[var(--studio-border-bright)] flex flex-col justify-between"
                style={{
                  borderLeftWidth: 3,
                  borderLeftColor: sev.color,
                }}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`studio-badge ${SEV_CLASS[sevKey] || "studio-sev-info"} !text-[10px]`}>
                          {sev.labelEs}
                        </span>
                        <span className="font-mono text-[11px] text-[var(--studio-text-secondary)]">
                          {r.id}
                        </span>
                      </div>
                      <h3 className="font-display font-semibold text-sm text-white mt-1.5">
                        {r.title}
                      </h3>
                    </div>
                    <div
                      className="w-7 h-7 rounded-[var(--radius-sm)] grid place-items-center shrink-0"
                      style={{ background: `${sev.color}15`, color: sev.color }}
                    >
                      <ShieldAlert size={15} />
                    </div>
                  </div>

                  <p className="text-xs text-[var(--studio-text-secondary)] leading-relaxed">
                    {r.description}
                  </p>

                  <div className="flex flex-wrap gap-1.5 mt-3 font-mono text-[11px]">
                    {r.cwe && (
                      <a
                        href={`https://cwe.mitre.org/data/definitions/${r.cwe.replace("CWE-", "")}.html`}
                        target="_blank"
                        rel="noreferrer"
                        className="studio-badge hover:text-blue-400 hover:border-blue-500/40 transition-colors"
                      >
                        {r.cwe} <ExternalLink size={9} />
                      </a>
                    )}
                    {owaspTag && (
                      <span className="studio-badge">
                        OWASP: {owaspTag}
                      </span>
                    )}
                  </div>
                </div>

                {r.recommendation && (
                  <div className="mt-3 rounded-[var(--radius-sm)] bg-[var(--studio-surface)] border border-[var(--studio-border)] p-2.5">
                    <div className="text-[11px] text-emerald-400 font-semibold mb-0.5">
                      Remediación recomendada
                    </div>
                    <p className="text-xs text-emerald-300/90 leading-relaxed">
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
