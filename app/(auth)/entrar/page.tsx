import Link from "next/link";
import { entrar } from "@/app/actions";
import { Campo } from "@/components/Campo";
import { Formulario } from "@/components/Formulario";
import { Moldura } from "@/components/Moldura";

export default function EntrarPage() {
  return (
    <Moldura titulo="Entrar">
      <Formulario acao={entrar} botao="Entrar">
        <Campo rotulo="E-mail" name="email" type="email" autoComplete="email" required />
        <Campo rotulo="Senha" name="senha" type="password" autoComplete="current-password" required />
      </Formulario>
      <p className="mt-6 text-center text-base text-muted-foreground">
        Primeira vez na mesa?{" "}
        <Link href="/cadastro" className="inline-block py-2 text-ouro underline-offset-4 hover:underline">
          Criar conta
        </Link>
      </p>
    </Moldura>
  );
}
