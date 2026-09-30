# Sistema de Autenticación (GitHub OAuth + JWT + Login UI) Implementation Plan

## Repository Research

**Estado actual:**
- Stack: **Backend Flask MVC** (`api/`) + **Frontend React 19 + TypeScript + Zustand** (`web/`)
- Despliegue: **Vercel Serverless** (`vercel.json`) con rewrites `/api/*` → `/api/index`
- Repo GitHub: `gs2018062254-sudo/Proyecto-Calidad` (rama `main`), CI/CD automático en Vercel
- Rutas frontend actuales: `/`, `/rules`, `/about`, `/reports`, `/history`, `/settings` — **todas públicas**
- Estado global: Zustand store en `web/src/store/sast.ts` (persistencia en `localStorage`)
- Backend: Blueprint único con 6 endpoints (`/api/health`, `/api/rules`, `/api/scan`, `/api/github/*`) públicos, CORS abierto (`*`)
- Dependencias backend: `Flask`, `Flask-Cors`, `Werkzeug`, `requests` — **sin JWT ni OAuth**
- Dependencias frontend: `react-router-dom@7`, `zustand@4`, `lucide-react` — **sin gestión de sesión auth**
- Tests: 29/29 pasando — **ninguno contempla auth**

**Decisiones del usuario:**
1. **Proveedor auth:** Login con **GitHub OAuth 2.0** (Authorization Code Flow)
2. **Fallback:** Usuarios demo hardcodeados por si OAuth no está configurado (entorno local/testing)
3. **Protección rutas frontend:** TODA la app requiere sesión activa (redirect `/login` si sin token)
4. **Protección backend:** Todos los `/api/*` (excepto auth endpoints y health básico) requieren **JWT Bearer Token**
5. **Persistencia sesión:** Token JWT en `localStorage` del navegador (stateless)
6. **Despliegue:** Commit + push directo a `main` para trigger de CI/CD en Vercel

## Files and Modules

### Backend Nuevos
- `api/services/auth_service.py` — Lógica JWT (firmar/validar), flujo OAuth GitHub (intercambio code→token), gestión usuarios demo
- `api/controllers/auth_controller.py` — Endpoints `/api/auth/login`, `/api/auth/callback`, `/api/auth/me`, `/api/auth/logout`, `/api/auth/demo-login`
- `api/middleware.py` — Decorador `@requires_auth` para proteger rutas del Blueprint (JWT Bearer check)
- `.env.example` — Variables entorno: `JWT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `OAUTH_REDIRECT_URI`

### Backend Modificados
- `api/app.py` — Configurar `app.secret_key`, cargar variables entorno, habilitar `supports_credentials=False` pero validar `Authorization` header
- `api/routes.py` — Agregar rutas auth, proteger endpoints existentes con `@requires_auth`
- `api/requirements.txt` — Agregar `PyJWT>=2.9.0`, `python-dotenv>=1.0.0`
- `requirements.txt` — Sincronizar mismas dependencias
- `tests/test_api_endpoints.py` — Agregar fixture para token demo válido, actualizar tests existentes con auth header, agregar tests de auth endpoints

### Frontend Nuevos
- `web/src/pages/Login.tsx` — Página de login con botón "Iniciar sesión con GitHub" + formulario fallback demo (email/contraseña)
- `web/src/lib/auth.ts` — Helpers frontend: `authFetch` wrapper con JWT auto-injectado, `loginWithGithub()`, `loginDemo()`, `logout()`, `getCurrentUser()`
- `web/src/components/ProtectedRoute.tsx` — Componente wrapper: si no hay sesión → `<Navigate to="/login" />`

### Frontend Modificados
- `web/src/store/sast.ts` — Agregar state auth: `currentUser`, `authToken`, métodos `login()`, `logout()`, `hydrateAuth()`; wrappear `runScan`, `fetchRules`, `fetchGithubRepos` con auth header
- `web/src/App.tsx` — Agregar ruta `/login`, proteger todas las demás rutas con `<ProtectedRoute>`
- `web/src/components/Topbar.tsx` — Agregar botón/avatar de usuario logueado + menú "Cerrar sesión"
- `web/src/components/Layout.tsx` — Incluir hook de hidratación de sesión al montar
- `web/src/types.ts` — Agregar interfaces `AuthUser`, `JwtPayload`
- `web/src/lib/api.ts` — Usar `authFetch` en lugar de `fetch` directo para que inyecte `Authorization: Bearer <token>`
- `web/.env.example` — Variables: `VITE_GITHUB_CLIENT_ID`, `VITE_API_BASE`

### Config & Deploy Modificados
- `vercel.json` — Mantener rewrites, asegurar `/api/auth/*` también enrutado
- `.gitignore` — Agregar `.env`
- `.github/workflows/ci-quality.yml` — Si corre pytest, inyectar `JWT_SECRET` test por variable de entorno

## Implementation Steps (Dependency Order)

### Fase 1: Backend Foundation
1. Agregar dependencias `PyJWT` y `python-dotenv` a ambos `requirements.txt`
2. Crear `.env.example` con placeholders para `JWT_SECRET`, credenciales GitHub OAuth
3. Crear `api/services/auth_service.py`:
   - Función `generate_jwt(user)` y `verify_jwt(token)` usando `JWT_SECRET`
   - Función `get_github_oauth_url(state)` → URL autorización GitHub
   - Función `exchange_github_code(code)` → POST `https://github.com/login/oauth/access_token` + GET `/user`
   - Fallback: `AUTH_DEMO_USERS` = `[{"email":"admin@calidad.tech","password_hash":"...","name":"Admin SAST","role":"admin"}]` + hash Werkzeug `generate_password_hash`
4. Crear `api/middleware.py` con decorador `@requires_auth`:
   - Lee `Authorization: Bearer <token>` header
   - Si válido → `g.current_user`; si inválido → 401 JSON `{"ok":false,"error":"Unauthorized"}`
   - Excepciones: `/api/health`, `/api/auth/*` (no requieren auth)
5. Crear `api/controllers/auth_controller.py`:
   - `GET /api/auth/login` → 302 redirect a GitHub OAuth URL + state aleatorio en `session` (o firmado en JWT corto)
   - `GET /api/auth/callback?code=&state=` → intercambio code → datos GitHub user → emitir JWT → redirect frontend con `#token=...` o query param
   - `POST /api/auth/demo-login` body `{email, password}` → validar contra `AUTH_DEMO_USERS` → JWT 200 OK
   - `GET /api/auth/me` (requires_auth) → devolver usuario decodificado del JWT
   - `POST /api/auth/logout` → 200 (stateless, el frontend borra el token)
6. Modificar `api/routes.py`:
   - Registrar endpoints auth
   - Aplicar `@requires_auth` a: `/api/rules`, `/api/scan`, `/api/github/user`, `/api/github/repos`, `/api/github/scan`
   - Mantener `/api/health` y `/api/auth/*` públicos
7. Modificar `api/app.py` para cargar `dotenv` al inicio, set `app.config["JWT_SECRET"]`

### Fase 2: Backward Compat Tests
8. Actualizar `tests/test_api_endpoints.py`:
   - Fixture `client_with_auth` que inyecta header `Authorization: Bearer <demo_jwt>` en todos los requests
   - Reescribir tests actuales para usar el cliente auth
   - Agregar tests nuevos:
     - `test_auth_demo_login_success` / `test_auth_demo_login_invalid`
     - `test_protected_endpoint_returns_401_without_token`
     - `test_auth_me_endpoint`

### Fase 3: Frontend Auth
9. Agregar tipos `AuthUser` a `web/src/types.ts`
10. Crear `web/src/lib/auth.ts`:
    - Const `AUTH_TOKEN_KEY = "sast.auth.token"`, `AUTH_USER_KEY = "sast.auth.user"`
    - `saveAuth(token, user)` / `loadAuth()` / `clearAuth()` en localStorage
    - `authFetch(url, init)`: wrapper fetch que agrega `Authorization: Bearer ${token}` y lanza error en 401 para redirigir login
    - `loginDemo(email, password)` → POST `/api/auth/demo-login` → guardar token + user
    - `getGithubLoginUrl()` → (opcional: pedir al backend URL OAuth o armarla en frontend con `VITE_GITHUB_CLIENT_ID`)
    - `logout()` → limpiar storage, navegar `/login`
11. Modificar `web/src/lib/api.ts`: reemplazar `fetch` nativo por `authFetch` para que todos los `/api/*` requests lleven JWT
12. Extender store Zustand (`web/src/store/sast.ts`):
    - Estado: `authToken: string|null`, `currentUser: AuthUser|null`, `authHydrated: boolean`
    - Actions: `hydrateAuth()`, `loginDemo()`, `logout()`, `setAuth(token, user)`
    - Al iniciar store ejecutar `hydrateAuth()` desde localStorage
13. Crear `web/src/pages/Login.tsx`:
    - Diseño moderno: tarjeta centrada con logo SAST Studio
    - Botón grande "Iniciar sesión con GitHub" (estilo GitHub) → `window.location = /api/auth/login`
    - Separador "O usar cuenta demo"
    - Form email + password + submit → `store.loginDemo()`
    - Manejo errores y loading state
    - Si OAuth callback con token en URL hash/query → parsear, guardar, redirect `/`
14. Crear `web/src/components/ProtectedRoute.tsx`:
    - Lee `currentUser` + `authToken` del store
    - Si token missing → `<Navigate to="/login" replace state={{from: location.pathname}} />`
    - Si token ok → renderizar `<Outlet />`
15. Modificar `web/src/App.tsx`:
    - `<Route path="/login" element={<Login />} />` FUERA del `Layout`
    - Wrappear todas las rutas con Layout con `<ProtectedRoute>`
16. Modificar `web/src/components/Topbar.tsx`:
    - Si `currentUser`: Avatar (iniciales o GitHub avatar_url) + menú dropdown: `Hola, {name}`, `Cerrar sesión`
    - Si no: link a `/login`
17. Modificar `web/src/components/Layout.tsx`: en `useEffect` inicial disparar `store.hydrateAuth()`

### Fase 4: Validación & Local Smoke Tests
18. Instalar nuevas dependencias Python (`py -m pip install PyJWT python-dotenv`) y frontend (no nuevas, rehusar `lucide-react` existente)
19. Ejecutar `py -m pytest -v` → 29 originales + nuevos tests pasando
20. Levantar API (port 5001) + Web (port 5173):
    - Probar acceso ruta `/` sin login → redirige `/login`
    - Login demo `admin@calidad.tech` + `Admin123!` → navega a home
    - Ejecutar scan de código → `/api/scan` devuelve 200 con JWT
    - Cerrar sesión → limpia storage, vuelve a `/login`

### Fase 5: Commit, Push & Vercel Deploy
21. `git add -A` todos los cambios + `.env.example`, `*.pyc`/`.env` en `.gitignore`
22. Commit message: `feat(auth): login github oauth + jwt + rutas protegidas`
23. Push a `origin/main` → esperar trigger Vercel
24. Indicar al usuario que configure en Vercel Project Settings → Environment Variables:
    - `JWT_SECRET` = cadena aleatoria fuerte (ej. `openssl rand -hex 32`)
    - `GITHUB_CLIENT_ID` y `GITHUB_CLIENT_SECRET` = crear app en GitHub → Settings → Developer settings → OAuth Apps, Authorization callback URL = `https://TU-DOMINIO-VERCEL/api/auth/callback`
    - `VITE_GITHUB_CLIENT_ID` = mismo Client ID para el frontend

## Dependencies and Considerations
- **PyJWT 2.x** — librería estándar JWT para Python, usar algoritmo `HS256`
- **python-dotenv** — cargar `.env` localmente, en Vercel ya usa sus env vars nativas
- **No se requiere base de datos** — todo stateless: JWT contienen `sub`, `email`, `name`, `provider`, `exp` (24h)
- **OAuth Flow** estándar Authorization Code: `GET github authorize` → `callback con code` → `POST github access_token` → `GET api.github.com/user` → JWT propio
- **Contraseñas demo** — almacenar como `werkzeug.security.generate_password_hash(salt_length=16)` en `AUTH_DEMO_USERS`, nunca en claro
- **Vite env** — prefijo `VITE_` para exposición cliente, `GITHUB_CLIENT_SECRET` NUNCA al frontend (solo backend lo usa)
- **Compatibilidad tests** — fixture `client_with_auth` genera un JWT demo firmado con `JWT_SECRET` de testing, evita que 29 tests originales se rompan
- **Risk CSRF** — al usar JWT en `Authorization` header (no en cookie) no hay CSRF; state param en OAuth protege login CSRF

## Validation
- `py -m pytest -v` → 100% tests pasando (incluye auth + endpoints protegidos)
- Frontend navega `/` sin sesión → `302 /login` (Navigate)
- Demo login credenciales válidas → 200, token guardado, redirigido home
- Demo login credenciales inválidas → 401 con mensaje UI
- `/api/scan` sin `Authorization` → 401 `{"ok":false,"error":"Unauthorized"}`
- `/api/scan` con `Authorization: Bearer <token>` → 200 hallazgos
- Topbar muestra usuario activo y botón logout; logout vuelve a `/login`
- OAuth GitHub con Client ID/Secret correctos: flujo completo GitHub → callback → JWT → home

## Risks
1. **GitHub OAuth no configurado en Vercel** → Handle: el login demo alternativo siempre funciona; página Login muestra banner explicativo si OAuth está deshabilitado (cuando `GITHUB_CLIENT_ID` no está seteado el backend devuelve URL vacía)
2. **JWT_SECRET débil o hardcodeado por accidente** → Handle: `os.environ["JWT_SECRET"]` es obligatorio en producción; si falta, app levanta warning y usa fallback `dev-secret-change-me` solo en `DEBUG=True`
3. **Tests existentes se rompen por falta de auth** → Handle: 1) fixture cliente con token demo válido inyectado en `Authorization` header por defecto, 2) test explícito que valida 401 sin token
4. **CORS y credenciales** → Handle: seguir usando header Bearer (no cookies), así `CORS(origins="*")` sigue siendo válido sin `supports_credentials`
5. **Race condición hidratación store antes de render rutas** → Handle: `authHydrated` flag en store; ProtectedRoute muestra `<Loading />` mientras `hydrateAuth()` no haya terminado
6. **Push directo a main sin revisión** → Handle: primero ejecutar todos los tests y smoke tests locales exitosamente; si todo pasa, push; si falla algo, arreglar antes
