import { LockKeyhole } from "lucide-react";
import { loginAction } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-sm items-center">
      <Card className="w-full">
        <CardHeader>
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
            <LockKeyhole className="h-5 w-5" />
          </div>
          <CardTitle>관리자 로그인</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={loginAction} className="space-y-3">
            <input
              name="password"
              type="password"
              required
              className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring"
              placeholder="관리자 비밀번호"
            />
            <Button type="submit" className="w-full">
              로그인
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
