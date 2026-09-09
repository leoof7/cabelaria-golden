"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { TENANT_ID } from "@/lib/constantes";
import { useExigirLogin } from "@/lib/usar-exigir-login";
import { centavosParaReais, reaisParaCentavos } from "@/lib/dinheiro";
import { hojeSP, somarDias, inicioDoDiaUTC, fimDoDiaUTC, formatarHoraSP, formatarDataExtensoSP } from "@/lib/data-sp";

type Lancamento = {
  id: string;
  tipo: "entrada" | "saida";
  valor_centavos: number;
  descricao: string;
  data: string;
};

export default function PaginaCaixa() {
  const { pronto, ehDono } = useExigirLogin();
  const [data, setData] = useState(hojeSP());
  const [lista, setLista] = useState<Lancamento[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarFormSaida, setMostrarFormSaida] = useState(false);

  async function carregar() {
    const { data: linhas, error } = await supabase
      .from("lancamento")
      .select("id, tipo, valor_centavos, descricao, data")
      .gte("data", inicioDoDiaUTC(data))
      .lte("data", fimDoDiaUTC(data))
      .order("data");

    if (error) {
      setErro(error.message);
      return;
    }
    setLista(linhas);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- busca ao trocar de dia
    if (pronto && ehDono) carregar();
  }, [pronto, ehDono, data]);

  if (!pronto) return <p className="p-6 text-texto-secundario">Carregando...</p>;

  if (!ehDono) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-texto-secundario">Só o dono acessa o caixa.</p>
        <Link href="/" className="text-dourado underline">
          Voltar
        </Link>
      </div>
    );
  }

  const totalEntradas = (lista ?? [])
    .filter((l) => l.tipo === "entrada")
    .reduce((soma, l) => soma + l.valor_centavos, 0);
  const totalSaidas = (lista ?? [])
    .filter((l) => l.tipo === "saida")
    .reduce((soma, l) => soma + l.valor_centavos, 0);
  const saldo = totalEntradas - totalSaidas;

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link href="/" className="text-sm text-texto-secundario">
            ← Voltar
          </Link>
          <h1 className="titulo-marca text-2xl text-dourado">Caixa</h1>
        </div>
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

      <div className="grid grid-cols-3 gap-3">
        <CartaoTotal titulo="Entradas" valorCentavos={totalEntradas} cor="text-entrada" />
        <CartaoTotal titulo="Saídas" valorCentavos={totalSaidas} cor="text-alerta" />
        <CartaoTotal titulo="Saldo" valorCentavos={saldo} cor="text-champanhe" />
      </div>

      {erro && <p className="text-alerta">{erro}</p>}

      <ul className="flex flex-col gap-2">
        {lista?.map((l) => (
          <li
            key={l.id}
            className="flex items-center justify-between rounded-lg bg-cartao px-4 py-3"
          >
            <div>
              <p className="text-sm">{l.descricao}</p>
              <p className="text-xs text-texto-secundario">{formatarHoraSP(l.data)}</p>
            </div>
            <p className={l.tipo === "entrada" ? "font-bold text-entrada" : "font-bold text-alerta"}>
              {l.tipo === "entrada" ? "+" : "-"} R$ {centavosParaReais(l.valor_centavos)}
            </p>
          </li>
        ))}
        {lista?.length === 0 && (
          <p className="text-texto-secundario">Nenhum lançamento nesse dia.</p>
        )}
      </ul>

      {mostrarFormSaida ? (
        <FormNovaSaida
          aoCriar={() => {
            setMostrarFormSaida(false);
            carregar();
          }}
          aoCancelar={() => setMostrarFormSaida(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setMostrarFormSaida(true)}
          className="rounded-lg border border-alerta py-3 text-base font-bold text-alerta"
        >
          + Registrar saída
        </button>
      )}
    </div>
  );
}

function CartaoTotal({
  titulo,
  valorCentavos,
  cor,
}: {
  titulo: string;
  valorCentavos: number;
  cor: string;
}) {
  return (
    <div className="rounded-xl bg-cartao px-3 py-3 text-center">
      <p className="text-xs text-texto-secundario">{titulo}</p>
      <p className={`text-sm font-bold ${cor}`}>
        R$ {centavosParaReais(valorCentavos)}
      </p>
    </div>
  );
}

function FormNovaSaida({
  aoCriar,
  aoCancelar,
}: {
  aoCriar: () => void;
  aoCancelar: () => void;
}) {
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("0,00");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    setSalvando(true);
    setErro(null);

    const { error } = await supabase.from("lancamento").insert({
      tenant_id: TENANT_ID,
      tipo: "saida",
      valor_centavos: reaisParaCentavos(valor),
      descricao,
    });

    setSalvando(false);
    if (error) {
      setErro(error.message);
      return;
    }
    aoCriar();
  }

  return (
    <form
      onSubmit={salvar}
      className="flex flex-col gap-3 rounded-xl bg-cartao px-5 py-4"
    >
      <label className="flex flex-col gap-1 text-sm text-texto-secundario">
        Descrição
        <input
          type="text"
          required
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          className="rounded-lg border border-dourado-escuro bg-fundo px-4 py-3 text-base text-texto-principal outline-none focus-visible:ring-2 focus-visible:ring-dourado"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-texto-secundario">
        Valor (R$)
        <input
          type="text"
          inputMode="decimal"
          required
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          className="rounded-lg border border-dourado-escuro bg-fundo px-4 py-3 text-base text-texto-principal outline-none focus-visible:ring-2 focus-visible:ring-dourado"
        />
      </label>

      {erro && <p className="text-sm text-alerta">{erro}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={salvando}
          className="flex-1 rounded-lg bg-alerta py-2 font-bold text-fundo disabled:opacity-60"
        >
          Salvar
        </button>
        <button
          type="button"
          onClick={aoCancelar}
          className="flex-1 rounded-lg border border-dourado-escuro py-2 font-semibold text-texto-secundario"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
