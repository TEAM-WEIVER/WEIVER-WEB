# WEIVER Web

위버 AI 면접 서비스의 React 프론트엔드. Vite로 빌드하며 본품 API는 백엔드가 제공한다. 공개 랜딩과 `/landing-assets`는 Oracle에서 제공하고 Vercel과 Vite 개발 서버가 해당 요청을 전달한다.

## 개발

```sh
pnpm install --frozen-lockfile
pnpm dev
```

개인 로그인 화면은 `http://localhost:3000/login`에서 열 수 있다. 본품은 기본적으로 `https://api.weiverai.com`을 호출한다. API 주소를 바꿀 때는 `VITE_API_BASE_URL`을, 면접 WebSocket 주소를 바꿀 때는 `VITE_WS_URL`을 지정한다. Vite 환경 변수는 브라우저 빌드에 포함되므로 공개 가능한 값만 사용한다. [로컬 HTTPS 및 개발용 API 프록시 설정](docs/local-https.md).

## 검증

```sh
pnpm lint:check
pnpm typecheck
pnpm test --run
pnpm build-storybook
pnpm build
CI=true pnpm test:e2e
```

Vercel은 `dist`를 배포하며 `vercel.json`에 지정된 본품 경로에서 React 앱을 제공한다.
