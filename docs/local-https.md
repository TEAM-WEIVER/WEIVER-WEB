# 로컬 HTTPS 개발 환경

로컬에서 운영과 가까운 쿠키 동작을 확인하려면 dev proxy 대신 HTTPS 로컬 도메인으로 Next.js dev server를 실행한다.

## 전제

백엔드 CORS/CSRF trusted origin에 아래 origin이 등록되어 있어야 한다.

```text
https://weiver.local.piuda.site:3000
```

DNS는 아래처럼 설정되어 있어야 한다.

```text
local.piuda.site      A  127.0.0.1
*.local.piuda.site    A  127.0.0.1
```

## 최초 1회 설정

mkcert를 설치하고 로컬 CA를 등록한다.

```bash
mkcert -install
```

프로젝트 루트에서 인증서를 발급한다.

```bash
mkdir -p .certs
mkcert \
  -cert-file .certs/local.piuda.site.pem \
  -key-file .certs/local.piuda.site-key.pem \
  local.piuda.site "*.local.piuda.site"
```

`.certs/`는 git에 올리지 않는다.

## 실행

```bash
pnpm dev:https
```

브라우저에서 접속한다.

```text
https://weiver.local.piuda.site:3000
```

## API 설정

HTTPS 로컬 도메인에서는 dev proxy를 사용하지 않고 백엔드 API를 직접 호출한다.

```text
NEXT_PUBLIC_API_BASE_URL=https://api.piuda.site
```

이 방식에서는 백엔드가 내려주는 `Domain=.piuda.site`, `Secure`, `SameSite` 쿠키 정책을 프론트에서 가공하지 않는다.

## dev proxy와의 차이

`pnpm dev` + `/api/dev-proxy`는 로컬에서 빠르게 개발하기 위한 임시 우회 수단이다. 쿠키의 `Domain`, `Secure`, `SameSite` 속성을 로컬에 맞게 보정하므로 운영과 완전히 같지 않다.

쿠키, CSRF, 인증 흐름을 확인할 때는 `pnpm dev:https`를 우선 사용한다.
