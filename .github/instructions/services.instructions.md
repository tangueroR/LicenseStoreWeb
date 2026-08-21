---
applyTo: "src/app/services/**,src/app/guards/**,src/app/interceptors/**"
description: Rules for services, guards and interceptors.
---

# Service, guard and interceptor instructions

## Services

- `@Injectable({ providedIn: 'root' })` — singletons only, no component-level providers.
- One responsibility per service. `AuthService` owns auth state, `LicenseService` owns
  license API calls. Do not mix the two.
- Use `inject()`; do not add constructor parameters to new services.
- Read the base URL from `environment.apiBaseUrl` — never hard-code a host.
- Return the raw `Observable` from `HttpClient`. Components decide about subscription,
  loading flags and error messages.
- Expose state as **read-only** signals:

```ts
private readonly _userName = signal('');
readonly userName = this._userName.asReadonly();
```

## API surface

| Call | Endpoint |
|------|----------|
| `getProjects(product, userName)` | `GET /api/projects/{product}?userName=` |
| `createLicense(product, request)` | `POST /api/licenses/{product}` |
| `deleteLicense(product, request)` | `POST /api/licenses/{product}/delete` |

Delete is a **POST**, not an HTTP DELETE — that matches the backend, do not "correct" it.
Listing uses `/api/projects/...` while writing uses `/api/licenses/...`; that asymmetry is
intentional.

## Guards

Functional guards only (`CanActivateFn`), with `inject()` inside the function body:

```ts
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  if (authService.isLoggedIn()) return true;
  router.navigate(['/login']);
  return false;
};
```

## Interceptors

Functional interceptors only (`HttpInterceptorFn`), registered in `app.config.ts` via
`provideHttpClient(withInterceptors([...]))`. Clone the request instead of mutating it.

## Security

- The JWT lives in `localStorage` under `auth_token` with `auth_expires_at`.
  `getToken()` returns `null` once the token is expired — keep that check.
- Never log tokens, passwords or generated license passwords.
- `logout()` must clear **every** `auth_*` key and reset all auth signals.
