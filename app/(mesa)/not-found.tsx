import { NaoEncontrado } from "@/components/Estados";

// Dentro da mesa o topo continua; só o conteúdo avisa que não achou (ex.: ficha de outra mesa).
export default function FichaNaoEncontrada() {
  return <NaoEncontrado />;
}
