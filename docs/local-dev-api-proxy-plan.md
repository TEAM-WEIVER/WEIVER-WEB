# 로컬 개발용 API Proxy 계획

작성일: 2026-05-20

## 목적

로컬 프론트 개발 서버에서 인증된 API 요청을 테스트할 수 있도록 Next.js Route Handler 기반 dev proxy를 추가한다.

현재 백엔드는 인증 관련 쿠키를 `.piuda.site` 도메인으로 내려준다. 브라우저는 `localhost`에서 `.piuda.site`용 쿠키를 저장하거나 전송할 수 없기 때문에, 로컬 개발 환경에서는 CSRF 토큰 발급과 인증 상태 API 테스트가 어렵다.

## 핵심 방향

- 운영 환경은 기존 API 호출 방식을 유지한다.
- 로컬 개발 환경에서만 프론트 요청을 Next dev server proxy로 우회한다.
- proxy가 백엔드 응답의 `Set-Cookie`를 localhost에서 저장 가능한 형태로 변환한다.
- `api-client`의 CSRF 흐름은 유지한다.

## 제안 구조

### 로컬 API Base URL

로컬 `.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=/api/dev-proxy
API_PROXY_TARGET=https://api.piuda.site
```

운영/배포 환경:

```env
NEXT_PUBLIC_API_BASE_URL=https://api.piuda.site
```

### Route Handler

추가 후보:

```text
src/app/api/dev-proxy/[...path]/route.ts
```

지원 method:

- `GET`
- `POST`
- `PATCH`
- `PUT`
- `DELETE`
- `OPTIONS`

요청 흐름:

```text
Browser
  -> http://localhost:3000/api/dev-proxy/api/auth/csrf
  -> Next dev proxy
  -> https://api.piuda.site/api/auth/csrf
```

## Cookie Rewrite 정책

백엔드가 내려주는 `Set-Cookie`에서 로컬 저장을 방해하는 속성을 dev proxy에서 조정한다.

처리 후보:

- `Domain=.piuda.site` 제거
- local HTTP 테스트가 필요하면 `Secure` 제거
- `SameSite=None`은 `Secure` 없이 브라우저가 거부할 수 있으므로 로컬에서는 `SameSite=Lax`로 변경 검토
- `Path`는 기본적으로 유지

주의:

- `Set-Cookie`가 여러 개 내려올 수 있으므로 하나의 문자열로 합치면 안 된다.
- 가능한 경우 각 쿠키를 개별 `Set-Cookie` 헤더로 유지해야 한다.
- 쿠키 rewrite는 dev proxy route 내부에서만 수행한다.

## 운영 영향 차단

dev proxy는 운영에서 동작하지 않아야 한다.

필수 안전장치:

- `process.env.NODE_ENV === 'production'`이면 `404` 또는 `403` 반환
- `API_PROXY_TARGET`은 서버 전용 환경 변수로 사용하고 `NEXT_PUBLIC_` prefix를 붙이지 않는다.
- 운영 환경에서는 `NEXT_PUBLIC_API_BASE_URL`을 `/api/dev-proxy`로 설정하지 않는다.

운영 요청 흐름:

```text
Browser
  -> https://api.piuda.site
```

로컬 요청 흐름:

```text
Browser
  -> http://localhost:3000/api/dev-proxy
  -> https://api.piuda.site
```

## `api-client` 영향

현재 구조:

```ts
fetch(`${API_BASE_URL}${path}`, {
  credentials: 'include',
});
```

로컬에서 `NEXT_PUBLIC_API_BASE_URL=/api/dev-proxy`로 설정하면 기존 호출이 그대로 proxy를 통한다.

예:

```text
apiRequest('/api/auth/csrf')
-> /api/dev-proxy/api/auth/csrf
```

따라서 `api-client`는 큰 변경 없이 유지할 수 있다.

## 검증 시나리오

브라우저에서 확인:

- Application 탭에서 localhost 쿠키 저장 여부 확인
- Network 탭에서 인증 후 요청에 `Cookie`가 포함되는지 확인
- Network 탭에서 CSRF가 필요한 요청에 `X-XSRF-TOKEN` 헤더가 포함되는지 확인

기능 확인:

- 기업 로그인
- 개인 로그인
- `GET /api/auth/csrf`
- `POST /api/auth/reissue`
- `POST /api/auth/logout`
- `DELETE /api/auth/applicants/me`
- 이후 온보딩 저장/업로드 API

## 구현 순서

1. `src/app/api/dev-proxy/[...path]/route.ts` 추가
2. 요청 method, query string, body, headers forwarding 구현
3. 백엔드 응답 status/body/header forwarding 구현
4. `Set-Cookie` rewrite 구현
5. production 차단 로직 추가
6. `.env.local`에서 `NEXT_PUBLIC_API_BASE_URL=/api/dev-proxy`로 변경
7. 브라우저에서 로그인과 CSRF 필요 요청 검증
8. `pnpm typecheck`, `pnpm lint:check`, `pnpm test` 실행

## 결론

Next.js dev proxy와 `Set-Cookie` rewrite를 사용하면 백엔드 수정 없이 로컬 개발 환경에서 인증 쿠키 기반 API 요청을 테스트할 수 있다.

단, 이 proxy는 로컬 개발 전용이어야 하며 운영 배포 환경에는 영향을 주지 않도록 반드시 production 차단 조건을 둔다.
