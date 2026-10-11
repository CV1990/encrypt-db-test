# Encrypt DB Test

Aplicación de registro y autenticación para comprobar que los datos del usuario se guardan **cifrados** en PostgreSQL.

| Carpeta     | Stack                                                        |
| ----------- | ------------------------------------------------------------ |
| `frontend/` | Vue 3 + TypeScript + Vite · Vitest · Playwright · nginx      |
| `backend/`  | NestJS 11 + TypeORM · Jest + Supertest · PostgreSQL 16       |

## Cómo se guardan los datos

| Columna (`users`)     | Técnica                    | ¿Reversible? | Para qué                                     |
| --------------------- | -------------------------- | ------------ | -------------------------------------------- |
| `email_encrypted`     | AES-256-GCM (IV aleatorio) | Sí (servidor) | Mostrar el correo al usuario                 |
| `full_name_encrypted` | AES-256-GCM (IV aleatorio) | Sí (servidor) | Mostrar el nombre al usuario                 |
| `email_hash`          | HMAC-SHA256 (blind index)  | **No**       | Buscar por correo y garantizar que es único  |
| `password_hash`       | bcrypt (sal aleatoria)     | **No**       | Verificar la contraseña en el login          |

- Formato del texto cifrado: `v1:<iv>:<authTag>:<ciphertext>` (base64). GCM detecta cualquier manipulación.
- La contraseña nunca se puede recuperar: en el login se compara con `bcrypt.compare`.
- Como AES-GCM usa un IV aleatorio, el mismo correo da un texto cifrado distinto cada vez; por eso la búsqueda se hace con el HMAC.
- La página **Mi perfil** muestra los datos descifrados junto al registro tal como está guardado en Postgres.

## API (`/api`)

| Método | Ruta                 | Auth   | Descripción                                   |
| ------ | -------------------- | ------ | --------------------------------------------- |
| POST   | `/auth/register`     | –      | `{ fullName, email, password }` → 201         |
| POST   | `/auth/login`        | –      | `{ email, password }` → `{ accessToken, user }` |
| GET    | `/auth/me`           | Bearer | Datos del usuario descifrados                 |
| GET    | `/auth/me/stored`    | Bearer | Registro del usuario tal como está en la BD   |
| GET    | `/health`            | –      | Healthcheck                                   |

## Ejecutar con Docker

```bash
cp .env.example .env
# Cambia los secretos: openssl rand -hex 32  (ENCRYPTION_KEY, BLIND_INDEX_KEY, JWT_SECRET)
docker compose up -d --build
```

- Frontend: http://localhost:8080 (nginx sirve la SPA y hace de proxy de `/api` hacia el backend)
- Backend: http://localhost:3000/api (solo desde localhost)
- Postgres: `localhost:5432` (solo desde localhost)

Comprobar los datos cifrados directamente en la base de datos:

```bash
docker compose exec db psql -U postgres encrypt_db -c "SELECT * FROM users;"
```

> ⚠️ Si pierdes `ENCRYPTION_KEY` no se pueden descifrar los datos guardados; si cambias `BLIND_INDEX_KEY` los usuarios existentes no podrán iniciar sesión.

## Desarrollo local

```bash
docker compose up -d db                      # solo Postgres

cd backend && cp .env.example .env           # pon DB_PASSWORD igual al del .env raíz
npm install && npm run start:dev             # http://localhost:3000/api

cd frontend && npm install && npm run dev    # http://localhost:5173 (proxy /api → :3000)
```

## Pruebas

```bash
# Backend
cd backend
npm test             # unitarias (cifrado, hashing, servicios, guard, controlador)
npm run test:e2e     # e2e con Supertest contra Postgres real (docker compose up -d db)

# Frontend
cd frontend
npm run test:unit    # unitarias con Vitest + Vue Test Utils
npm run test:e2e     # e2e con Playwright y la API simulada
E2E_BASE_URL=http://localhost:8080 npx playwright test fullstack   # e2e contra el stack de docker compose
```

> Para el e2e del backend crea antes la base de datos de pruebas:
> `docker compose exec db createdb -U postgres encrypt_db_test`

## CI/CD (`.github/workflows/ci-cd.yml`)

En cada push y PR a `main`:

1. **backend**: typecheck, tests unitarios con cobertura, e2e contra un servicio Postgres y build.
2. **frontend**: typecheck, tests unitarios con cobertura, build y e2e con Playwright.
3. **integration**: levanta `docker compose`, registra un usuario por la API, comprueba con `pg_dump` que no hay datos personales en claro y ejecuta el e2e full-stack.
4. **docker** (solo en push a `main`): publica las imágenes en Docker Hub:
   - `<DOCKERHUB_USERNAME>/<IMAGE_NAME>-backend:latest` y `:<sha>`
   - `<DOCKERHUB_USERNAME>/<IMAGE_NAME>-frontend:latest` y `:<sha>`

Configuración en GitHub (*Settings → Secrets and variables → Actions*):

| Tipo     | Nombre               | Valor                                                         |
| -------- | -------------------- | ------------------------------------------------------------- |
| Secret   | `DOCKERHUB_USERNAME` | Tu usuario de Docker Hub                                       |
| Secret   | `DOCKERHUB_TOKEN`    | Access token de Docker Hub con permiso *Read & Write*          |
| Variable | `IMAGE_NAME`         | `encrypt-db-test` (solo el nombre, sin usuario; opcional)      |
| Variable | `NODE_VERSION`       | `20` (opcional)                                                |

Docker Hub crea los repositorios como **públicos** en el primer push (salvo que tu cuenta tenga otra visibilidad por defecto).

Desplegar en un servidor con las imágenes publicadas:

```bash
# En .env:
# BACKEND_IMAGE=<usuario-dockerhub>/encrypt-db-test-backend:latest
# FRONTEND_IMAGE=<usuario-dockerhub>/encrypt-db-test-frontend:latest
docker compose pull && docker compose up -d --no-build
```
