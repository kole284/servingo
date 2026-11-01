import { Field } from "@/components/form-fields";
import { AdminForm } from "../admin-form";
import { signIn } from "./actions";

export default function SignInPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-8 px-4 py-12">
      <div>
        <p className="text-2xl font-semibold text-accent">Servingo</p>
        <h1 className="mt-2 caps-title text-lg">Prijava za admine</h1>
      </div>
      <AdminForm action={signIn} submitLabel="Prijavi se">
        <Field label="Email" name="email" type="email" autoComplete="username" required />
        <Field label="Lozinka" name="password" type="password" autoComplete="current-password" required />
      </AdminForm>
    </main>
  );
}
