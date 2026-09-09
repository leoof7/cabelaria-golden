"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useExigirLogin } from "@/lib/usar-exigir-login";
import { centavosParaReais } from "@/lib/dinheiro";
import {
  hojeSP,
  somarDias,
  inicioDoDiaUTC,
  fimDoDiaUTC,
  formatarDataExtensoSP,
} from "@/lib/data-sp";

type FormaPagamento = "dinheiro" | "pix" | "debito" | "credito";

type LinhaAtendimento = {
  id: string;
  profissional_id: string;
  valor_pago_centavos: number;
  forma_pagamento: FormaPagamento;
  nome_profissional: string | { nome: string } | { nome: string }[] | null;
};

const RÓTULO_FORMA: Record<FormaPagamento, string> = {
  dinheiro: "Dinheiro",
  pix: "Pix",
  debito: "Débito",
  credito: "Crédito",
};

export default function PaginaFechamento() {
  const { pronto, ehDono } = useExigirLogin();
  const [data, setData] = useState(hojeSP());
  const [atendimentos, setAtendimentos] = useState<LinhaAtendimento[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!pronto || !ehDono) return;

    (async () => {
      const { data: linhas, error } = await supabase
        .from("atendimento")
        .select(
          "id, profissional_id, valor_pago_centavos, forma_pagamento, " +
            "nome_profissional:profissional_id(nome)",
        )
        .gte("data", inicioDoDiaUTC(data))
        .lte("data", fimDoDiaUTC(data))
        .returns<LinhaAtendimento[]>();

      if (error) {
        setErro(error.message);
        return;
      }
      setAtendimentos(linhas);
    })();
  }, [pronto, ehDono, data]);

  if (!pronto) return <p className="p-6 text-texto-secundario">Carregando...</p>;

  if (!ehDono) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-texto-secundario">Só o dono acessa o fechamento do dia.</p>
        <Link href="/" className="text-dourado underline">
          Voltar
        </Link>
      </div>
    );
  }

  const totalDia = atendimentos.reduce((s, a) => s + a.valor_pago_centavos, 0);

  const porForma = agrupar(atendimentos, (a) => a.forma_pagamento, RÓTULO_FORMA);
  const porProfissional = agrupar(atendimentos, (a) => a.profissional_id, undefined, (a) => {
    const p = a.nome_profissional;
    if (!p) return "—";
    if (typeof p === "string") return p;
    const obj = Array.isArray(p) ? p[0] : p;
    return obj?.nome ?? "—";
  });

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-8">
      <div>
        <Link href="/" className="text-sm text-texto-secundario">
          ← Voltar
        </Link>
        <h1 className="titulo-marca text-2xl text-dourado">Fechamento do dia</h1>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-xl bg-cartao px-4 py-3">
        <button
          type="button"
          onClick={() => setData((d) => somarDias(d, -1))}
          className="rounded-lg border border-dourado-escuro px-3 py-2 text-dourado"
          aria-label="Dia anterior"
        >
          ←
        </button>
        <p className="text-center font-semibold capitalize">
          {formatarDataExtensoSP(data)}
        </p>
        <button
          type="button"
          onClick={() => setData((d) => somarDias(d, 1))}
          className="rounded-lg border border-dourado-escuro px-3 py-2 text-dourado"
          aria-label="Próximo dia"
        >
          →
        </button>
      </div>

      {erro && <p className="text-alerta">{erro}</p>}

      <div className="rounded-xl bg-cartao px-5 py-6 text-center">
        <p className="text-sm text-texto-secundario">Total recebido no dia</p>
        <p className="text-3xl font-bold text-champanhe">
          R$ {centavosParaReais(totalDia)}
        </p>
        <p className="text-xs text-texto-secundario">
          {atendimentos.length} atendimento{atendimentos.length !== 1 && "s"} fechado
          {atendimentos.length !== 1 && "s"}
        </p>
      </div>

      <div>
        <p className="mb-2 text-sm text-texto-secundario">Por forma de pagamento</p>
        <ul className="flex flex-col gap-2">
          {porForma.map(({ chave, total, quantidade }) => (
            <li
              key={chave}
              className="flex items-center justify-between rounded-lg bg-cartao px-4 py-3"
            >
              <span>
                {chave} <span className="text-texto-secundario">({quantidade})</span>
              </span>
              <span className="font-bold text-champanhe">R$ {centavosParaReais(total)}</span>
            </li>
          ))}
          {porForma.length === 0 && (
            <p className="text-texto-secundario">Nenhum atendimento fechado nesse dia.</p>
          )}
        </ul>
      </div>

      <div>
        <p className="mb-2 text-sm text-texto-secundario">Por profissional</p>
        <ul className="flex flex-col gap-2">
          {porProfissional.map(({ chave, total, quantidade }) => (
            <li
              key={chave}
              className="flex items-center justify-between rounded-lg bg-cartao px-4 py-3"
            >
              <span>
                {chave} <span className="text-texto-secundario">({quantidade})</span>
              </span>
              <span className="font-bold text-champanhe">R$ {centavosParaReais(total)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function agrupar(
  linhas: LinhaAtendimento[],
  chaveDe: (l: LinhaAtendimento) => string,
  rotulos?: Record<string, string>,
  rotuloDe?: (l: LinhaAtendimento) => string,
) {
  const mapa = new Map<string, { total: number; quantidade: number }>();

  for (const linha of linhas) {
    const chaveBruta = chaveDe(linha);
    const chave = rotuloDe ? rotuloDe(linha) : rotulos?.[chaveBruta] ?? chaveBruta;
    const atual = mapa.get(chave) ?? { total: 0, quantidade: 0 };
    atual.total += linha.valor_pago_centavos;
    atual.quantidade += 1;
    mapa.set(chave, atual);
  }

  return Array.from(mapa.entries())
    .map(([chave, v]) => ({ chave, ...v }))
    .sort((a, b) => b.total - a.total);
}
