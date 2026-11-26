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

- [develop 최신 Storybook](https://team-weiver-fork-develop--6984406065e2ec8c4bbbc539.chromatic.com)
- [Chromatic 빌드 이력](https://www.chromatic.com/builds?appId=6984406065e2ec8c4bbbc539)

기존 Chromatic 프로젝트가 이전 저장소(`Minchaez/PIUDA`)에 연결되어 있어 현재 조직의 develop은 `TEAM-WEIVER:develop`으로 표시된다. 위 고정 링크는 이 브랜치를 가리킨다. 저장소 연결을 변경하면 공유 주소도 다시 확인한다.

`.github/workflows/chromatic.yml`은 develop에 push될 때마다 Storybook을 별도로 배포한다. `Promote develop to main`과 병렬로 실행되며 서로의 성공 여부에 영향을 주지 않는다. main 승격 후에는 Storybook을 중복 배포하지 않는다. 배포된 버전의 링크는 Actions 실행 요약에 표시된다. 인증 정보는 저장소 Actions secret `CHROMATIC_PROJECT_TOKEN`으로 관리한다.

Chromatic은 **Storybook 배포 전용**으로 사용한다. [Manage → Automate](https://www.chromatic.com/manage?appId=6984406065e2ec8c4bbbc539&view=automate)에서 `UI Review`, `Visual tests`, `Accessibility tests`를 모두 `Disabled`로 유지한다. 이 설정은 저장소가 아닌 Chromatic 프로젝트에 저장되며 모든 브랜치에 즉시 적용된다. 프로젝트를 새로 만들거나 연결을 변경할 때도 같은 설정을 확인한다.

배포할 때마다 전체 스토리를 빌드·업로드하므로 위 고정 링크에서 최신 컴포넌트와 상호작용을 계속 확인할 수 있다. 자동 스크린샷 촬영·이전 버전과의 비교는 실행하지 않아 새 billed snapshots가 발생하지 않는다. 기존에 사용한 스냅샷 수는 초기화되지 않는다. [Chromatic 집계 기준](https://www.chromatic.com/docs/billing/).

`--exit-once-uploaded`는 업로드 후 CLI를 종료하는 옵션일 뿐 테스트를 끄지 않는다. 촬영 중단은 위 프로젝트 설정으로 제어한다. 배포 자체를 생략하는 `--skip`은 사용하지 않는다. 기존 CI의 Vitest·Storybook 상호작용/접근성 검사·Playwright 테스트는 유지한다.

수동 재배포는 GitHub Actions → Chromatic → Run workflow에서 develop을 선택한다. 다른 브랜치를 선택하면 해당 브랜치의 Storybook을 배포하며 develop 고정 링크를 갱신하지 않는다. 동일 브랜치의 배포는 업로드 순서가 뒤집히지 않도록 직렬 실행한다.

```sh
pnpm storybook        # 로컬 확인
pnpm build-storybook  # 정적 빌드 확인
```

배포 설정을 변경한 뒤에는 작업 브랜치에서 워크플로를 수동 실행해 Actions 요약의 Storybook 링크가 새 버전을 가리키는지 확인한다. Chromatic 빌드에 시각 테스트가 없고 Manage → Automate의 `Billed snapshots this month`가 배포 전후 증가하지 않는지도 확인한다. 작업 브랜치 배포는 develop 고정 링크를 갱신하지 않는다.

Storybook의 예시 데이터·콜백은 실제 저장/API 연동과 구분된다. 팀 접근 권한은 Chromatic의 Manage → Collaborate에서 관리한다.

## 홈·이력서 개발용 mock API (#202)

```bash
pnpm dev:mock
```

`/login`에서 테스트용 이메일·비밀번호를 입력하면 개발 세션으로 홈에 진입합니다. `mock@example.test`와 `MockPassword1!`을 사용할 수 있습니다. mock 모드는 `VITE_ENABLE_MOCK_API=true`와 Vite 개발 모드가 모두 켜졌을 때만 MSW를 시작합니다. 화면 상단에 mock 표시가 있으며, 운영 빌드와 일반 `pnpm dev`에는 자동 적용되지 않습니다.

- 홈은 이력서·포인트·공고를 HTTP 요청으로 조회합니다. `GET/PUT /api/resumes/master`, `GET /api/home/points`, `GET /api/home/postings`는 백엔드 계약 확정 전의 프론트엔드 개발용 계약입니다. 확정 후 `src/lib/home-api.ts`에서 맞춥니다.
- 이력서와 공고는 #203의 탭 단위 보관소를 mock DB로 공유합니다. 같은 탭의 새로고침에는 복원되며 탭을 닫거나 로그인 세션을 초기화하면 지워집니다. 실제 서버에 저장하지 않습니다.
- 포인트 `300P`, 면접 비용 `100P`, 면접 기록 `0회`는 mock 값입니다. 결제·충전·실제 면접을 수행하지 않습니다.
- 이력서: `/home` → `/resume/master` → 임시 저장 또는 저장하고 홈으로. 조회 실패는 재시도하고 저장 실패는 입력을 유지합니다.
- 푸터: 이용약관 `/terms`, 개인정보처리방침 `/privacy`, 고객지원 `/support`. 약관·개인정보 내용은 기존 회원가입 문구를 재사용합니다. 고객지원 문의도 mock 모드에서는 실제로 전송되지 않습니다.
- 미구현 API는 mock 모드에서 501로 응답하며 실제 서버로 전달하지 않습니다. mock 모드에서 운영 계정·실제 개인정보를 사용하지 않습니다.

```bash
pnpm test:e2e:mock --reporter=line
```

위 테스트는 Playwright의 API 응답 가로채기 없이 실제 MSW를 통해 로그인·이력서 저장·새로고침 복원·홈 공고 갱신을 검증합니다.
