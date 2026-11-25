# P Join · 앱 저장소

이 저장소는 P Join 앱 코드와 `docs/` 서브모듈을 관리합니다. 제품 요구사항, 화면 설계, 개발 환경, ERD와 API 계약은 [프로젝트 문서 안내](docs/README.md)에서 확인할 수 있습니다.

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
