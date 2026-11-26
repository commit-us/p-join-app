# P Join · 앱 저장소

이 저장소는 npm workspaces 기반 JavaScript 모노레포입니다. Next.js 웹과 Express API를 함께 관리합니다. 명세는 [프로젝트 문서 안내](docs/README.md)에서 확인합니다.

## 디렉터리 구조

```text
apps/
  web/
    public/
    src/
      app/             페이지·레이아웃 (JavaScript)
      features/        프로젝트·북마크·좋아요·지원
      components/      공통 UI
      lib/api/         API 호출·오류 처리
      styles/          공통 스타일
  api/
    prisma/
      schema.prisma    Prisma 공통 설정
      models/          ERD 테이블별 .prisma 파일
      migrations/
    prisma.config.js
    src/
      app.js
      server.js
      routes/
      modules/         기능별 API 모듈
      middleware/
      config/
      db/client.js     Prisma 클라이언트
 docs/                 문서 Git 서브모듈
```

Prisma는 API 앱이 관리합니다. 웹은 API를 통해 데이터에 접근합니다. 화면과 기능별 빈 폴더는 기본 골격이며 업무 기능은 아직 구현하지 않았습니다.

## 로컬 실행

코드 검사는 루트에서 `npm run lint`, 자동 수정 가능한 항목 처리는 `npm run lint:fix`로 실행합니다. Next.js·React 기본 검사와 선언되지 않은 변수·엄격한 동등 비교 검사를 적용합니다. 미사용 변수와 `const` 권장은 경고이며, 의도적으로 사용하지 않는 함수 인자는 `_`로 시작합니다. 서식과 명명 규칙은 별도로 강제하지 않습니다.

Node.js와 npm 버전은 [기술 스택 문서](docs/06_tech_stack.md)를 따릅니다. `.env.example`을 `.env`로 복사한 뒤 의존성을 설치하고 PostgreSQL을 시작합니다.

```sh
npm install
cp .env.example .env
docker compose up -d postgres
npm run db:generate
```

웹과 API는 각각 별도 터미널에서 실행합니다.

```sh
npm run dev:web
npm run dev:api
```

웹은 `http://localhost:3000`, API 상태 확인은 `http://localhost:4000/health`에서 접근합니다. DB 스키마와 초기 마이그레이션은 ERD 검토 후 생성합니다.

`docs/`는 [p-join-docs](https://github.com/commit-us/p-join-docs)의 특정 커밋을 가리킵니다. GitHub의 `docs @ <커밋 해시>`에서 앱이 사용하는 문서 버전을 확인할 수 있습니다.

## 처음 클론하기

```bash
git clone --recurse-submodules https://github.com/commit-us/p-join-app.git
cd p-join-app
```

## 최신 앱과 문서 받기

이미 클론한 경우 앱 저장소 루트에서 실행합니다.

```bash
git switch main
git pull --ff-only
git submodule update --init --recursive
```

이 명령은 `p-join-app/main`에 기록된 커밋으로 `docs/`를 맞춥니다. 서브모듈 옵션 없이 클론했을 때도 마지막 명령으로 `docs/`를 받을 수 있습니다.

## 앱에서 참조하는 문서 버전 올리기

먼저 문서 변경을 `p-join-docs/main`에 병합합니다. 그런 다음 앱 저장소 루트에서 작업 브랜치를 만들고 새 문서 커밋을 기록합니다.

```bash
git switch main
git pull --ff-only
git submodule update --init --recursive
git switch -c chore/update-docs-submodule
git -C docs fetch origin main
git -C docs switch --detach FETCH_HEAD
git add docs
git diff --cached --submodule=short
git commit -m "chore: update docs submodule"
git push -u origin chore/update-docs-submodule
```

`docs` 변경이 스테이징되지 않았다면 앱이 이미 해당 문서 커밋을 사용하고 있으므로 커밋·푸시를 생략합니다. 변경이 있다면 앱 저장소에서 PR을 열어 `main`에 병합합니다. 병합 후 팀원들은 위의 최신 앱과 문서 받기 명령으로 같은 문서 버전을 받습니다.
