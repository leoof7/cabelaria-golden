"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { TENANT_ID } from "@/lib/constantes";
import { useExigirLogin } from "@/lib/usar-exigir-login";
import { centavosParaReais, reaisParaCentavos } from "@/lib/dinheiro";
import { formatarHoraSP } from "@/lib/data-sp";

type FormaPagamento = "dinheiro" | "pix" | "debito" | "credito";

// Sem geração automática de tipos do banco ainda (falta o projeto Supabase
// final — ver PENDENCIAS.md), então descrevemos à mão o formato da linha
// que volta desse select com relacionamentos.
type LinhaAgendamentoComJuncoes = {
  id: string;
  profissional_id: string;
  servico_id: string;
  cliente_id: string;
  data_hora_inicio: string;
  profissional: { nome: string } | { nome: string }[] | null;
  servico: { nome: string; preco_centavos: number } | { nome: string; preco_centavos: number }[] | null;
  cliente: { nome: string } | { nome: string }[] | null;
};

type AgendamentoDetalhe = {
  id: string;
  profissional_id: string;
  servico_id: string;
  cliente_id: string;
  data_hora_inicio: string;
  nome_profissional: string;
  nome_servico: string;
  nome_cliente: string;
  preco_centavos: number;
};

export default function PaginaFecharAtendimento() {
  return (
    <Suspense fallback={<p className="p-6 text-texto-secundario">Carregando...</p>}>
      <FormularioFecharAtendimento />
    </Suspense>
  );
}

function FormularioFecharAtendimento() {
  const { pronto, perfil, ehDono } = useExigirLogin();
  const router = useRouter();
  const parametros = useSearchParams();
  const agendamentoId = parametros.get("agendamento");
  const dataDaAgenda = parametros.get("data");

  const [detalhe, setDetalhe] = useState<AgendamentoDetalhe | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const [valorCobrado, setValorCobrado] = useState("0,00");
  const [valorPago, setValorPago] = useState("0,00");
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>("pix");

  useEffect(() => {
    if (!pronto || !agendamentoId) return;

    (async () => {
      const { data, error } = await supabase
        .from("agendamento")
        .select(
          "id, profissional_id, servico_id, cliente_id, data_hora_inicio, " +
            "profissional:profissional_id(nome), servico:servico_id(nome, preco_centavos), " +
            "cliente:cliente_id(nome)",
        )
        .eq("id", agendamentoId)
        .single<LinhaAgendamentoComJuncoes>();

      if (error || !data) {
        setErro(error?.message ?? "Agendamento não encontrado.");
        return;
      }

      // O Supabase devolve os relacionamentos como objeto (às vezes array,
      // dependendo da versão do client) — normaliza os dois formatos.
      const profissional = Array.isArray(data.profissional)
        ? data.profissional[0]
        : data.profissional;
      const servico = Array.isArray(data.servico) ? data.servico[0] : data.servico;
      const cliente = Array.isArray(data.cliente) ? data.cliente[0] : data.cliente;

      const preco = servico?.preco_centavos ?? 0;

      setDetalhe({
        id: data.id,
        profissional_id: data.profissional_id,
        servico_id: data.servico_id,
        cliente_id: data.cliente_id,
        data_hora_inicio: data.data_hora_inicio,
        nome_profissional: profissional?.nome ?? "",
        nome_servico: servico?.nome ?? "",
        nome_cliente: cliente?.nome ?? "",
        preco_centavos: preco,
      });
      setValorCobrado(centavosParaReais(preco));
      setValorPago(centavosParaReais(preco));
    })();
  }, [pronto, agendamentoId]);

  async function salvar() {
    if (!detalhe) return;
    setSalvando(true);
    setErro(null);

    try {
      const { data: atendimento, error: erroAtendimento } = await supabase
        .from("atendimento")
        .insert({
          tenant_id: TENANT_ID,
          agendamento_id: detalhe.id,
          profissional_id: detalhe.profissional_id,
          servico_id: detalhe.servico_id,
          cliente_id: detalhe.cliente_id,
          valor_cobrado_centavos: reaisParaCentavos(valorCobrado),
          valor_pago_centavos: reaisParaCentavos(valorPago),
          forma_pagamento: formaPagamento,
        })
        .select("id")
        .single();
      if (erroAtendimento) throw erroAtendimento;

      const { error: erroLancamento } = await supabase.from("lancamento").insert({
        tenant_id: TENANT_ID,
        tipo: "entrada",
        valor_centavos: reaisParaCentavos(valorPago),
        descricao: `${detalhe.nome_servico} — ${detalhe.nome_cliente}`,
        atendimento_id: atendimento.id,
      });
      if (erroLancamento) throw erroLancamento;

      const { error: erroAgendamento } = await supabase
        .from("agendamento")
        .update({ status: "concluido" })
        .eq("id", detalhe.id);
      if (erroAgendamento) throw erroAgendamento;

      router.push(dataDaAgenda ? `/agenda?data=${dataDaAgenda}` : "/agenda");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não deu certo, tenta de novo.");
    } finally {
      setSalvando(false);
    }
  }

  if (!pronto || !detalhe) {
    return (
      <div className="flex flex-1 flex-col gap-4 px-6 py-8">
        <Link href="/agenda" className="text-sm text-texto-secundario">
          ← Voltar pra agenda
        </Link>
        {erro && <p className="text-alerta">{erro}</p>}
        {!erro && <p className="text-texto-secundario">Carregando...</p>}
      </div>
    );
  }

  if (!ehDono && perfil?.profissional_id !== detalhe.profissional_id) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-texto-secundario">
          Esse atendimento é de outro profissional — só quem atendeu (ou o
          dono) pode fechar.
        </p>
        <Link href="/agenda" className="text-dourado underline">
          Voltar pra agenda
        </Link>
      </div>
    );
  }

  const houveDesconto =
    reaisParaCentavos(valorPago) < reaisParaCentavos(valorCobrado);

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-8">
      <div>
        <Link href="/agenda" className="text-sm text-texto-secundario">
          ← Voltar pra agenda
        </Link>
        <h1 className="titulo-marca text-2xl text-dourado">
          Fechar atendimento
        </h1>
      </div>
      <div className="divisoria-metalica" />

      <div className="rounded-xl bg-cartao px-5 py-4">
        <p className="text-lg font-semibold">{detalhe.nome_cliente}</p>
        <p className="text-sm text-texto-secundario">
          {detalhe.nome_servico} · {formatarHoraSP(detalhe.data_hora_inicio)} com{" "}
          {detalhe.nome_profissional}
        </p>
      </div>

      <label className="flex flex-col gap-1 text-sm text-texto-secundario">
        Valor cobrado (R$)
        <input
          type="text"
          inputMode="decimal"
          value={valorCobrado}
          onChange={(e) => setValorCobrado(e.target.value)}
          className="rounded-lg border border-dourado-escuro bg-cartao px-4 py-3 text-lg font-bold text-texto-principal outline-none focus-visible:ring-2 focus-visible:ring-dourado"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-texto-secundario">
        Valor pago (R$)
        <input
          type="text"
          inputMode="decimal"
          value={valorPago}
          onChange={(e) => setValorPago(e.target.value)}
          className="rounded-lg border border-dourado-escuro bg-cartao px-4 py-3 text-lg font-bold text-champanhe outline-none focus-visible:ring-2 focus-visible:ring-dourado"
        />
      </label>
      {houveDesconto && (
        <p className="text-xs text-texto-secundario">
          Isso conta como desconto — não é conta pendente do cliente.
        </p>
      )}

      <label className="flex flex-col gap-1 text-sm text-texto-secundario">
        Forma de pagamento
        <select
          value={formaPagamento}
          onChange={(e) => setFormaPagamento(e.target.value as FormaPagamento)}
          className="rounded-lg border border-dourado-escuro bg-cartao px-4 py-3 text-base text-texto-principal outline-none focus-visible:ring-2 focus-visible:ring-dourado"
        >
          <option value="pix">Pix</option>
          <option value="dinheiro">Dinheiro</option>
          <option value="debito">Débito</option>
          <option value="credito">Crédito</option>
        </select>
      </label>

      {erro && <p className="text-alerta">{erro}</p>}

      <button
        type="button"
        onClick={salvar}
        disabled={salvando}
        className="rounded-lg bg-entrada py-3 text-base font-bold text-fundo disabled:opacity-60"
      >
        {salvando ? "Salvando..." : "Confirmar e fechar"}
      </button>
    </div>
  );
}
