// Dinheiro no banco é sempre centavos (inteiro) — essas funções são a
// única ponte entre isso e o que a pessoa digita/vê em reais na tela.

export function centavosParaReais(centavos: number): string {
  return (centavos / 100).toFixed(2).replace(".", ",");
}

export function reaisParaCentavos(reaisTexto: string): number {
  let normalizado = reaisTexto.trim();

  // Se tem vírgula E ponto, o ponto é separador de milhar (ex: "1.234,56")
  // — remove os pontos e usa a vírgula como decimal. Se só tem vírgula, ela
  // é o decimal. Se só tem ponto, trata como decimal (formato "45.00").
  if (normalizado.includes(",") && normalizado.includes(".")) {
    normalizado = normalizado.replace(/\./g, "").replace(",", ".");
  } else {
    normalizado = normalizado.replace(",", ".");
  }

  const valor = Number(normalizado);
  return Math.round((Number.isFinite(valor) ? valor : 0) * 100);
}
