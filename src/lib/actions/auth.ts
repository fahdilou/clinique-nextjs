"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!email || !password) return { error: "Email et mot de passe requis." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Identifiants invalides." };

  // Auto-provisionne dans la table utilisateurs si l'user existe dans Supabase Auth mais pas dans utilisateurs
  const existing = await prisma.utilisateur.findUnique({ where: { email } });
  if (!existing) {
    await prisma.utilisateur.create({
      data: {
        nom: email.split("@")[0],
        email,
        mot_de_passe: "supabase-auth",
        role: "caissier",
        actif: 1,
        permissions: "[]",
      },
    });
  } else if (existing.actif === 0) {
    await supabase.auth.signOut();
    return { error: "Compte désactivé." };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
