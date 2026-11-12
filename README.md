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

## Storybook 공유 및 배포

- [main 최신 Storybook](https://team-weiver-fork-main--6984406065e2ec8c4bbbc539.chromatic.com)
- [Chromatic 빌드 이력](https://www.chromatic.com/builds?appId=6984406065e2ec8c4bbbc539)

기존 Chromatic 프로젝트가 이전 저장소(`Minchaez/PIUDA`)에 연결되어 있어 현재 조직의 main은 `TEAM-WEIVER:main`으로 표시된다. 위 고정 링크는 이 브랜치를 가리킨다. 저장소 연결을 변경하면 공유 주소도 다시 확인한다.

`.github/workflows/chromatic.yml`은 main에 push될 때마다 Storybook을 별도로 배포한다. 서비스 CI/E2E 및 승격과 독립적으로 실행되며, 배포된 버전의 링크는 Actions 실행 요약에 표시된다. 인증 정보는 저장소 Actions secret `CHROMATIC_PROJECT_TOKEN`으로 관리한다.

수동 재배포는 GitHub Actions → Chromatic → Run workflow에서 main을 선택한다. 다른 브랜치를 선택하면 해당 브랜치의 Storybook을 배포하며 main 고정 링크를 갱신하지 않는다. 동일 브랜치의 배포는 업로드 순서가 뒤집히지 않도록 직렬 실행한다.

```sh
pnpm storybook        # 로컬 확인
pnpm build-storybook  # 정적 빌드 확인
```

Storybook의 예시 데이터·콜백은 실제 저장/API 연동과 구분된다. 팀 접근 권한은 Chromatic의 Manage → Collaborate에서 관리한다.
