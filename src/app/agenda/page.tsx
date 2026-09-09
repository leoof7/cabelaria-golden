"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useExigirLogin } from "@/lib/usar-exigir-login";
import {
  hojeSP,
  somarDias,
  inicioDoDiaUTC,
  fimDoDiaUTC,
  formatarHoraSP,
  formatarDataExtensoSP,
  minutosDoDiaSP,
  minutosDoHorario,
} from "@/lib/data-sp";

const ALTURA_15MIN = 18; // px por bloco de 15 minutos

type Profissional = {
  id: string;
  nome: string;
  horario_abertura: string;
  horario_fechamento: string;
};

type Agendamento = {
  id: string;
  profissional_id: string;
  cliente_id: string;
  servico_id: string;
  data_hora_inicio: string;
  duracao_minutos: number;
  status: "agendado" | "concluido" | "cancelado" | "faltou";
};

export default function PaginaAgenda() {
  return (
    <Suspense fallback={<p className="p-6 text-texto-secundario">Carregando...</p>}>
      <ConteudoAgenda />
    </Suspense>
  );
}

function ConteudoAgenda() {
  const { pronto, perfil, ehDono } = useExigirLogin();
  const dataInicial = useSearchParams().get("data");
  const [data, setData] = useState(dataInicial ?? hojeSP());
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [nomesCliente, setNomesCliente] = useState<Record<string, string>>({});
  const [nomesServico, setNomesServico] = useState<Record<string, string>>({});
  const [erro, setErro] = useState<string | null>(null);

  async function carregar(dataAlvo: string) {
    setErro(null);

    const [resProfissionais, resAgendamentos] = await Promise.all([
      supabase
        .from("profissional")
        .select("id, nome, horario_abertura, horario_fechamento")
        .eq("ativo", true)
        .order("nome"),
      supabase
        .from("agendamento")
        .select(
          "id, profissional_id, cliente_id, servico_id, data_hora_inicio, duracao_minutos, status",
        )
        .neq("status", "cancelado")
        .gte("data_hora_inicio", inicioDoDiaUTC(dataAlvo))
        .lte("data_hora_inicio", fimDoDiaUTC(dataAlvo))
        .order("data_hora_inicio"),
    ]);

    if (resProfissionais.error) {
      setErro(resProfissionais.error.message);
      return;
    }
    if (resAgendamentos.error) {
      setErro(resAgendamentos.error.message);
      return;
    }

    setProfissionais(resProfissionais.data);
    setAgendamentos(resAgendamentos.data);

    const clienteIds = [...new Set(resAgendamentos.data.map((a) => a.cliente_id))];
    const servicoIds = [...new Set(resAgendamentos.data.map((a) => a.servico_id))];

    const [resClientes, resServicos] = await Promise.all([
      clienteIds.length
        ? supabase.from("cliente").select("id, nome").in("id", clienteIds)
        : Promise.resolve({ data: [], error: null }),
      servicoIds.length
        ? supabase.from("servico").select("id, nome").in("id", servicoIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    setNomesCliente(
      Object.fromEntries((resClientes.data ?? []).map((c) => [c.id, c.nome])),
    );
    setNomesServico(
      Object.fromEntries((resServicos.data ?? []).map((s) => [s.id, s.nome])),
    );
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- busca ao trocar de dia
    if (pronto) carregar(data);
  }, [pronto, data]);

  if (!pronto) return <p className="p-6 text-texto-secundario">Carregando...</p>;

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 py-6 sm:px-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link href="/" className="text-sm text-texto-secundario">
            ← Voltar
          </Link>
          <h1 className="titulo-marca text-2xl text-dourado">Agenda do dia</h1>
        </div>
        <Link
          href={`/agendamento/novo?data=${data}`}
          className="whitespace-nowrap rounded-lg bg-dourado px-4 py-2 text-sm font-bold text-fundo"
        >
          + Agendar
        </Link>
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
        <div className="text-center">
          <p className="font-semibold capitalize">{formatarDataExtensoSP(data)}</p>
          {data !== hojeSP() && (
            <button
              type="button"
              onClick={() => setData(hojeSP())}
              className="text-xs text-dourado underline"
            >
              voltar para hoje
            </button>
          )}
        </div>
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

      {profissionais.length === 0 ? (
        <p className="text-texto-secundario">Nenhum profissional ativo cadastrado.</p>
      ) : (
        <div className="flex flex-1 gap-4 overflow-x-auto pb-4">
          {profissionais.map((prof) => (
            <ColunaProfissional
              key={prof.id}
              profissional={prof}
              agendamentos={agendamentos.filter((a) => a.profissional_id === prof.id)}
              nomesCliente={nomesCliente}
              nomesServico={nomesServico}
              podeFechar={ehDono || perfil?.profissional_id === prof.id}
              data={data}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ColunaProfissional({
  profissional,
  agendamentos,
  nomesCliente,
  nomesServico,
  podeFechar,
  data,
}: {
  profissional: Profissional;
  agendamentos: Agendamento[];
  nomesCliente: Record<string, string>;
  nomesServico: Record<string, string>;
  podeFechar: boolean;
  data: string;
}) {
  const inicioMin = minutosDoHorario(profissional.horario_abertura);
  const fimMin = minutosDoHorario(profissional.horario_fechamento);
  const totalSlots = Math.max(0, Math.round((fimMin - inicioMin) / 15));
  const alturaTotal = totalSlots * ALTURA_15MIN;

  return (
    <div className="w-64 shrink-0">
      <p className="mb-2 text-center font-semibold text-champanhe">
        {profissional.nome}
      </p>
      <div
        className="relative rounded-xl bg-cartao"
        style={{ height: alturaTotal }}
      >
        {Array.from({ length: totalSlots }).map((_, i) => {
          const minuto = inicioMin + i * 15;
          const éHoraCheia = minuto % 60 === 0;
          return (
            <div
              key={i}
              className="absolute left-0 right-0 border-t border-dourado-escuro/20"
              style={{ top: i * ALTURA_15MIN }}
            >
              {éHoraCheia && (
                <span className="absolute -top-2 left-2 text-[10px] text-texto-secundario">
                  {String(Math.floor(minuto / 60)).padStart(2, "0")}:00
                </span>
              )}
            </div>
          );
        })}

        {agendamentos.map((a) => {
          const inicioAgendamentoMin = minutosDoDiaSP(a.data_hora_inicio);
          const topo = ((inicioAgendamentoMin - inicioMin) / 15) * ALTURA_15MIN;
          const altura = Math.max(
            ALTURA_15MIN,
            (a.duracao_minutos / 15) * ALTURA_15MIN,
          );
          const corFundo =
            a.status === "concluido"
              ? "bg-entrada/40"
              : a.status === "faltou"
                ? "bg-alerta/40"
                : "bg-dourado-escuro";

          const conteudo = (
            <>
              <p className="font-bold text-champanhe">
                {formatarHoraSP(a.data_hora_inicio)} ·{" "}
                {nomesCliente[a.cliente_id] ?? "Cliente"}
              </p>
              <p className="text-texto-principal/80">
                {nomesServico[a.servico_id] ?? "Serviço"}
                {a.status === "concluido" && " · fechado"}
                {a.status === "faltou" && " · faltou"}
              </p>
            </>
          );

          if (a.status !== "agendado" || !podeFechar) {
            return (
              <div
                key={a.id}
                className={`absolute left-1 right-1 overflow-hidden rounded-md px-2 py-1 text-xs ${corFundo}`}
                style={{ top: topo, height: altura }}
              >
                {conteudo}
              </div>
            );
          }

          return (
            <Link
              key={a.id}
              href={`/atendimento/fechar?agendamento=${a.id}&data=${data}`}
              className={`absolute left-1 right-1 overflow-hidden rounded-md px-2 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-dourado ${corFundo}`}
              style={{ top: topo, height: altura }}
            >
              {conteudo}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
