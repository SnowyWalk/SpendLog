import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">설정</h1>
        <p className="text-sm text-muted-foreground">
          백업과 배포 값을 서버 환경변수로 관리합니다.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>서버 설정</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>CODEF 자격증명은 클라이언트에 노출하지 않습니다.</p>
          <p>Postgres 백업/복원 절차는 배포 문서에서 관리합니다.</p>
        </CardContent>
      </Card>
    </div>
  );
}
