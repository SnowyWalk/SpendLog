# 통합가계부 배포

## 구성

- Next.js standalone 서버
- PostgreSQL
- Prisma migrate/seed
- CODEF 조회는 서버 런타임에서만 실행

## 필수 환경변수

`.env.example`을 기준으로 값을 채웁니다. 실제 `.env`는 커밋하지 않습니다.

- `DATABASE_URL`
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`
- `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`, `SYNC_ADMIN_TOKEN`
- `CODEF_PUBLIC_KEY`, CODEF client id/secret
- 조회 대상별 `connectedId`와 필요한 생년월일/계좌번호 값

관리자 비밀번호 해시는 로컬 Node에서 생성합니다. 새 배포는 `scrypt` 형식을 사용합니다.

```bash
node -e "const crypto=require('crypto'); const p=process.argv[1]; const s=crypto.randomBytes(16).toString('hex'); const h=crypto.scryptSync(p,s,64).toString('hex'); console.log('scrypt:'+s+':'+h)" "your-password"
```

## 실행

```bash
docker compose up -d --build
```

`migrate` one-shot 서비스가 `prisma migrate deploy`와 `prisma/seed.js`를 먼저 실행한 뒤 앱 컨테이너가 시작됩니다. 앱 컨테이너 자체는 `node server.js`만 실행합니다.

## 점검

```bash
docker compose ps
docker compose logs -f app
curl http://localhost:${APP_PORT:-3000}/api/health
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
curl -X POST "http://localhost:${APP_PORT:-3000}/api/sync/run" \
  -H "Authorization: Bearer $SYNC_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"provider":"bc-card","startDate":"2026-06-01","endDate":"2026-06-29"}'
```

프록시 뒤에 배포할 때는 원래 `Host`, `Origin`, `Referer` 헤더가 앱까지 보존되도록 설정하세요. 브라우저 세션 기반 변경 요청은 같은 origin으로 검증되며, 자동 동기화는 `Authorization: Bearer $SYNC_ADMIN_TOKEN`으로 검증됩니다.
