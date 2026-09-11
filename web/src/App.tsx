import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Rules from "./pages/Rules";
import About from "./pages/About";

type PlaceholderProps = {
  title: string;
  subtitle?: string;
  badge?: string;
};

function Placeholder({ title, subtitle, badge }: PlaceholderProps) {
  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="label-title mb-2">Sección</div>
          <h1 className="section-title">{title}</h1>
          {subtitle && (
            <p className="mt-2 text-[15px] text-surface-500 max-w-2xl leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
        {badge && <span className="chip chip-purple">{badge}</span>}
      </div>
      <div className="card p-10 text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-primary-50 border border-primary-100 grid place-items-center mb-4">
          <svg viewBox="0 0 24 24" width="30" height="30" fill="none">
            <path
              d="M12 3 L15 9 L22 10 L17 15 L18 22 L12 19 L6 22 L7 15 L2 10 L9 9 Z"
              stroke="#2563eb"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="font-display font-bold text-[20px] text-surface-900">
          {title} — Proximamente
        </div>
        <div className="mt-1 text-[14px] text-surface-500">
          Esta sección del dashboard está en desarrollo. Mientras tanto, usa la página
          <span className="font-semibold text-primary-700 mx-1">Inicio</span>
          para lanzar análisis, o la de <span className="font-semibold text-primary-700 mx-1">Reglas</span> para ver el catálogo.
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route
            path="/analysis"
            element={
              <Navigate to="/" replace />
            }
          />
          <Route path="/rules" element={<Rules />} />
          <Route path="/about" element={<About />} />
          <Route
            path="/reports"
            element={
              <Placeholder
                title="Reportes"
                subtitle="Historial de reportes exportables en SARIF, JSON y HTML con filtros por severidad, fecha y regla."
                badge="En roadmap"
              />
            }
          />
          <Route
            path="/history"
            element={
              <Placeholder
                title="Historial"
                subtitle="Registro completo de todos los análisis realizados, con comparativa de vulnerabilidades entre revisiones."
                badge="En roadmap"
              />
            }
          />
          <Route
            path="/settings"
            element={
              <Placeholder
                title="Configuración"
                subtitle="Ajustes avanzados: umbrales de severidad, integraciones (GitHub, CI/CD), API tokens y preferencias."
                badge="En roadmap"
              />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
