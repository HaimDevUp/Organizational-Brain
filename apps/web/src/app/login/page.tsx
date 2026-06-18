import { signIn, authConfigStatus } from "@/lib/auth";
import { normalizeAppUrl } from "@/lib/env";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";

const AUTH_ERRORS: Record<string, string> = {
  Configuration: "Server auth is misconfigured. Check AUTH_SECRET and Google OAuth env vars on Vercel.",
  AccessDenied: "Access denied. Your account may not be allowed to sign in.",
  Verification: "Sign-in link expired. Please try again.",
  OAuthSignin: "Could not start Google sign-in. Check AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET.",
  OAuthCallback: "Google callback failed. Check AUTH_URL and the redirect URI in Google Cloud Console.",
  OAuthAccountNotLinked: "This email is already linked to another sign-in method.",
  Default: "Sign-in failed. Please try again.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const params = await searchParams;
  const config = authConfigStatus();
  const errorMessage = params.error
    ? AUTH_ERRORS[params.error] ?? AUTH_ERRORS.Default
    : null;

  const configIssues: string[] = [];
  if (!config.hasSecret) configIssues.push("AUTH_SECRET is missing on the server.");
  if (!config.hasGoogle) configIssues.push("AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET are missing.");
  if (!config.hasDatabase) configIssues.push("DATABASE_URL is missing (required to save users after login).");
  if (config.authUrl && !normalizeAppUrl(config.authUrl)) {
    configIssues.push("AUTH_URL is invalid.");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Organizational Brain</CardTitle>
          <CardDescription>Sign in with your Google account to continue.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorMessage && (
            <p className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {errorMessage}
            </p>
          )}
          {configIssues.length > 0 && (
            <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200">
              <p className="font-medium mb-1">Server configuration issue</p>
              <ul className="list-disc pl-4 space-y-1">
                {configIssues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            </div>
          )}
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: params.callbackUrl ?? "/dashboard" });
            }}
          >
            <Button type="submit" className="w-full" disabled={configIssues.length > 0}>
              Continue with Google
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
