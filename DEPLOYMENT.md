# 통합가계부 배포

## 구성

- Next.js standalone 서버
- PostgreSQL
- Prisma migrate/seed
- CODEF 조회는 서버 런타임에서만 실행
- Nginx Proxy Manager 연결용 외부 Docker 네트워크 `proxy`
- 배포 도메인: `codef.snowywalk.me`

## 필수 환경변수

`.env.example`을 기준으로 값을 채웁니다. 실제 `.env`는 커밋하지 않습니다.

- `DATABASE_URL`
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`
- `SYNC_ADMIN_TOKEN`
- `APP_PUBLIC_HOST=codef.snowywalk.me`
- `CODEF_PUBLIC_KEY`, CODEF client id/secret
- 조회 대상별 `connectedId`와 필요한 생년월일/계좌번호 값

앱 자체 로그인은 사용하지 않습니다. 외부 접근 제어는 Nginx Proxy Manager Access List에서 설정합니다. 앱은 `APP_PUBLIC_HOST`와 다른 `Host`/`X-Forwarded-Host`로 들어온 요청을 거부해 컨테이너명 직접 접근이 우연히 노출되는 일을 막습니다.

## 실행

```bash
docker network inspect proxy >/dev/null 2>&1 || docker network create proxy
docker compose up -d --build
```

`migrate` one-shot 서비스가 `prisma migrate deploy`와 `prisma/seed.js`를 먼저 실행한 뒤 앱 컨테이너가 시작됩니다. 앱 컨테이너 자체는 `node server.js`만 실행합니다.

## 점검

```bash
docker compose ps
docker compose logs -f app
docker compose exec app node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>console.log(r.status))"
```

## 백업

```bash
docker compose exec db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > backup.sql
```

## 복원

새 DB에 복원한 뒤 앱을 다시 시작합니다.

```bash
docker compose exec -T db psql -U "$POSTGRES_USER" "$POSTGRES_DB" < backup.sql
docker compose restart app
```

## 동기화

웹 UI의 `/sync`에서 공급자와 날짜 범위를 선택해 수동 동기화합니다. 자동 실행은 서버에서만 다음처럼 호출합니다.

```bash
curl -X POST "https://codef.snowywalk.me/api/sync/run" \
  -H "Authorization: Bearer $SYNC_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"provider":"bc-card","startDate":"2026-06-01","endDate":"2026-06-29"}'
```

Nginx Proxy Manager에서는 `codef.snowywalk.me`를 앱 컨테이너의 `3000` 포트로 연결하고 Access List로 접근을 제한합니다. 프록시 뒤에 배포할 때는 원래 `Host`, `X-Forwarded-Host`, `Origin`, `Referer` 헤더가 앱까지 보존되도록 설정하세요. 브라우저 기반 변경 요청은 같은 origin으로 검증되며, 자동 동기화 API는 `Authorization: Bearer $SYNC_ADMIN_TOKEN`으로 검증됩니다.
