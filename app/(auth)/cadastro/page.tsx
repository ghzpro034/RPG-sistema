import Link from "next/link";
import { cadastrar } from "@/app/actions";
import { Campo } from "@/components/Campo";
import { Formulario } from "@/components/Formulario";
import { Moldura } from "@/components/Moldura";

export default function CadastroPage() {
  return (
    <Moldura titulo="Criar conta">
      <Formulario acao={cadastrar} botao="Criar conta">
        <Campo rotulo="Seu nome" name="nome" autoComplete="nickname" required />
        <Campo rotulo="E-mail" name="email" type="email" autoComplete="email" required />
        <Campo
          rotulo="Senha"
          name="senha"
          type="password"
          autoComplete="new-password"
          minLength={6}
          required
        />
      </Formulario>
      <p className="mt-6 text-center text-base text-muted-foreground">
        Já tem conta?{" "}
        <Link href="/entrar" className="text-ouro underline-offset-4 hover:underline">
          Entrar
        </Link>
      </p>
    </Moldura>
  );
}
