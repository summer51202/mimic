import { AuthForm } from "@/features/auth/auth-form";

type RegisterPageProps = {
  searchParams?: Promise<{
    returnTo?: string | string[];
  }>;
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams;
  const returnTo = Array.isArray(params?.returnTo)
    ? params?.returnTo[0]
    : params?.returnTo;

  return <AuthForm mode="register" returnTo={returnTo} />;
}
