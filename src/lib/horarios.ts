// Calcula os horários de início possíveis para um novo agendamento.
// Regra do negócio (ver ESCOPO.md): a grade é sempre de 15 em 15 minutos —
// a duração do serviço não muda o passo, só bloqueia o tempo necessário e
// impede oferecer um horário sem espaço suficiente antes do fechamento ou
// antes do próximo agendamento já marcado.

export type Ocupado = { inicioMin: number; fimMin: number };

const PASSO_MINUTOS = 15;

export function calcularHorariosLivres(
  aberturaMin: number,
  fechamentoMin: number,
  ocupados: Ocupado[],
  duracaoMinutos: number,
): number[] {
  const livres: number[] = [];

  // A grade sempre cai em :00/:15/:30/:45, mesmo que o horário de abertura
  // do profissional não seja um múltiplo de 15 (ex: cadastraram "09:10").
  const inicioGrade = Math.ceil(aberturaMin / PASSO_MINUTOS) * PASSO_MINUTOS;

  for (
    let inicio = inicioGrade;
    inicio + duracaoMinutos <= fechamentoMin;
    inicio += PASSO_MINUTOS
  ) {
    const fim = inicio + duracaoMinutos;
    const temConflito = ocupados.some(
      (o) => inicio < o.fimMin && fim > o.inicioMin,
    );
    if (!temConflito) livres.push(inicio);
  }

  return livres;
}

export function agruparPorPeriodo(minutosLista: number[]) {
  const manha = minutosLista.filter((m) => m < 12 * 60);
  const tarde = minutosLista.filter((m) => m >= 12 * 60 && m < 18 * 60);
  const noite = minutosLista.filter((m) => m >= 18 * 60);
  return { manha, tarde, noite };
}

export function minutosParaHora(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
