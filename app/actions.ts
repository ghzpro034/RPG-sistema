"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { COOKIE_MESA } from "@/lib/sessao";
import { createClient } from "@/lib/supabase/server";

export type EstadoForm = { erro?: string } | undefined;

const credenciais = z.object({
  email: z.email("E-mail inválido"),
  senha: z.string().min(6, "A senha precisa ter pelo menos 6 caracteres"),
});

function traduzirErro(mensagem: string) {
  if (/invalid login credentials/i.test(mensagem)) return "E-mail ou senha incorretos";
  if (/already registered/i.test(mensagem)) return "Esse e-mail já tem uma conta";
  if (/email not confirmed/i.test(mensagem)) return "Confirme o e-mail antes de entrar";
  if (/rate limit/i.test(mensagem)) return "Muitas tentativas. Espere um pouco e tente de novo";
  return mensagem;
}

export async function entrar(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const dados = credenciais.safeParse({ email: form.get("email"), senha: form.get("senha") });
  if (!dados.success) return { erro: dados.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: dados.data.email,
    password: dados.data.senha,
  });
  if (error) return { erro: traduzirErro(error.message) };
  redirect("/");
}

export async function cadastrar(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const nome = String(form.get("nome") ?? "").trim();
  if (!nome) return { erro: "Diga como quer ser chamado na mesa" };
  const dados = credenciais.safeParse({ email: form.get("email"), senha: form.get("senha") });
  if (!dados.success) return { erro: dados.error.issues[0].message };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: dados.data.email,
    password: dados.data.senha,
    options: { data: { nome } },
  });
  if (error) return { erro: traduzirErro(error.message) };
  if (!data.session) {
    return { erro: "Conta criada, mas o Supabase pediu confirmação por e-mail. Desligue o \"Confirm email\" no painel." };
  }
  redirect("/comecar");
}

export async function sair() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/entrar");
}

export async function criarCampanha(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const nome = String(form.get("nome") ?? "").trim();
  if (!nome) return { erro: "Dê um nome para a mesa" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("criar_campanha", { p_nome: nome });
  if (error) return { erro: error.message };
  await abrirMesa((data as { id: string }).id);
  redirect("/mesa");
}

// guarda qual mesa está aberta (o usuário pode estar em várias)
async function abrirMesa(id: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_MESA, id, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
}

export async function trocarMesa(form: FormData) {
  const id = String(form.get("mesa") ?? "");
  if (id) await abrirMesa(id);
  revalidatePath("/", "layout");
  redirect("/");
}

export async function entrarCampanha(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const codigo = String(form.get("codigo") ?? "").trim();
  if (!codigo) return { erro: "Digite o código que o mestre passou" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("entrar_campanha", { p_codigo: codigo });
  if (error) return { erro: error.message };
  // quem já tem personagem entra com ele na mesa nova; quem não tem cria em /comecar
  await abrirMesa(data as string);
  redirect("/");
}

export async function criarPersonagem(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const nome = String(form.get("nome") ?? "").trim();
  const campanhaId = String(form.get("campanha_id") ?? "");
  if (!nome) return { erro: "Dê um nome ao personagem" };

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/entrar");

  const { error } = await supabase
    .from("personagens")
    .insert({ nome, campanha_id: campanhaId, dono_id: userId });
  if (error) return { erro: error.message };
  redirect("/ficha");
}
