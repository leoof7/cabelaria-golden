// Dinheiro no banco é sempre centavos (inteiro) — essas funções são a
// única ponte entre isso e o que a pessoa digita/vê em reais na tela.

export function centavosParaReais(centavos: number): string {
  return (centavos / 100).toFixed(2).replace(".", ",");
}

export function reaisParaCentavos(reaisTexto: string): number {
  const normalizado = reaisTexto.replace(",", ".").trim();
  const valor = Number(normalizado);
  return Math.round((Number.isFinite(valor) ? valor : 0) * 100);
}
