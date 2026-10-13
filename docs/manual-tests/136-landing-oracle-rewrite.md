# #136 배포 인수 확인

로컬 구현·목 테스트와 실제 배포 인수는 구분한다. 현재 운영 예약 API의 preflight가 403이므로 예약 CORS·실제 저장 확인은 미완료다.

## 배포 정보

- 본품 구현 브랜치: `feat/136-landing-oracle-rewrite`.
- 랜딩 후보 브랜치: `codex/17-landing-domain-assets`, PR #18 OPEN.
- 확인한 후보 HEAD: `cc26b1659f82b514c75def9c57add537eb360385` (2026-10-13).
- Oracle 실제 배포 SHA·배포 시각: 담당자 확인 필요. 후보 HEAD와 공개 파일의 일치를 아직 입증하지 않았다.
- Preview: https://weiver-1i11t9t5a-minchaezs-projects.vercel.app/ , 구현 commit `bdda167`, Vercel deployment `C1u9asf3pZVSK3w3qW2piMdqTnHX`. 배포는 성공했지만 Vercel 로그인 보호로 페이지 인수는 대기 중이다.
- 운영 전 정상 deployment ID: 운영 배포 전 확인·기록.

## Preview

- [ ] 기존 본품 Vercel 프로젝트·Preview 환경변수와 배포 commit을 확인한다.
- [ ] `/` 직접 접근·새로고침 시 URL 유지와 랜딩 콘텐츠를 확인한다.
- [ ] HTML·JS·CSS·이미지·favicon·OG 이미지가 200과 적합한 MIME 타입으로 제공되는지 확인한다.
- [ ] `/login` 개인·기업 탭, `/signup/account-info`, 허용된 역할의 온보딩·개인/기업 dashboard를 직접 열고 새로고침한다.
- [ ] 본품 `/_next/*`·RSC 이동, 회원가입 완료 route, 인증 실패·역할 불일치의 기존 처리를 확인한다.
- [ ] 404 홈 링크가 전체 문서 탐색으로 실제 랜딩을 표시하는지 확인한다.
- [ ] Oracle 원본 장애의 격리 재현 결과를 확인한다. 공유 원본을 중단하지 않는다.
- [ ] Preview Origin의 API 허용 여부를 확인한다. 미허용이면 예약 실연동은 대기하고 원인을 기록한다.

## 운영

- [ ] Preview 검증 완료 후 운영 배포 권한·프로젝트·commit·롤백 대상 ID를 확인하고 같은 브랜치를 배포한다.
- [ ] `https://weiverai.com/`와 `/login`을 재검증한다.
- [ ] 운영 Origin에서 `/api/v1/reservations` preflight가 허용되는지 확인한다. 현재 403이 해소되어야 한다.
- [ ] 브라우저의 예약 POST가 `https://landing-api.weiverai.com/api/v1/reservations`로 직접 전송되고 credential CORS가 통과하는지 확인한다.
- [ ] 담당자와 정한 테스트 예약으로 기존 성공 안내·응답 식별자·서버/DB 저장 결과를 연결해 확인한다. 개인정보·토큰은 로그/문서에서 제거한다.
- [ ] 중복 이메일 409와 서버/네트워크 실패의 기존 안내를 확인한다. 운영 장애를 유발하지 않는다.
- [ ] Oracle Deploy workflow 재실행이 미병합 후보를 이전 main 빌드로 덮어쓰지 않도록 확인한다.
- [ ] 결과를 이슈/PR에 기록하고 전체 체크리스트·CI·사람 검수 완료 후 병합한다.

## 현재 차단 사항

2026-10-13 04:34 UTC, 다음 읽기 전용 확인은 HTTP 403, `Invalid CORS request`를 반환했다.

```sh
curl -i -X OPTIONS \
  -H 'Origin: https://weiverai.com' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: content-type' \
  https://landing-api.weiverai.com/api/v1/reservations
```

필요한 조치: 랜딩/API 담당자가 운영 Origin 및 credential CORS 설정·배포를 확인한다. 허용 Origin을 `*`로 바꾸는 것은 `credentials: 'include'` 요청의 해결책이 아니다. 수정 후 실제 브라우저와 저장 결과로 다시 검증한다.
