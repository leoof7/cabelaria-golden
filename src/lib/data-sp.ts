// Ajuda a lidar com "fronteira de dia" sempre no fuso de São Paulo, como
// pede o CLAUDE.md — mesmo que o navegador de quem está usando o sistema
// esteja em outro fuso (não deveria acontecer, mas evita surpresa).
//
// O Brasil não tem mais horário de verão desde 2019, então São Paulo é
// sempre UTC-3, sem variação — dá pra usar esse deslocamento fixo em vez de
// depender de biblioteca de fuso horário.

export function hojeSP(): string {
  return new Date()
    .toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" }); // formato YYYY-MM-DD
}

export function somarDias(dataYMD: string, dias: number): string {
  const [ano, mes, dia] = dataYMD.split("-").map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  data.setUTCDate(data.getUTCDate() + dias);
  return data.toISOString().slice(0, 10);
}

export function inicioDoDiaUTC(dataYMD: string): string {
  return new Date(`${dataYMD}T00:00:00-03:00`).toISOString();
}

export function fimDoDiaUTC(dataYMD: string): string {
  return new Date(`${dataYMD}T23:59:59.999-03:00`).toISOString();
}

export function formatarHoraSP(isoTexto: string): string {
  return new Date(isoTexto).toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatarDataExtensoSP(dataYMD: string): string {
  const data = new Date(`${dataYMD}T12:00:00-03:00`);
  return data.toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

// Minutos desde 00:00, no fuso de SP, de um timestamp ISO.
export function minutosDoDiaSP(isoTexto: string): number {
  const [h, m] = new Date(isoTexto)
    .toLocaleTimeString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
    .split(":")
    .map(Number);
  return h * 60 + m;
}

export function minutosDoHorario(horaTexto: string): number {
  const [h, m] = horaTexto.split(":").map(Number);
  return h * 60 + m;
}

// Monta um timestamp ISO (com o -03:00 explícito) a partir de uma data
// (YYYY-MM-DD) e um horário em minutos desde 00:00, os dois já pensados no
// fuso de São Paulo.
export function dataEHoraParaISO(dataYMD: string, minutosDoDia: number): string {
  const h = Math.floor(minutosDoDia / 60);
  const m = minutosDoDia % 60;
  const hora = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
  return new Date(`${dataYMD}T${hora}-03:00`).toISOString();
}
