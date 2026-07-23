import { AuthForm } from "@/features/auth/auth-form";

type LoginPageProps = {
  searchParams?: Promise<{
    returnTo?: string | string[];
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const returnTo = Array.isArray(params?.returnTo)
    ? params?.returnTo[0]
    : params?.returnTo;

  return <AuthForm mode="login" returnTo={returnTo} />;
}
