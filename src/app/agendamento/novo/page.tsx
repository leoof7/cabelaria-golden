"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { TENANT_ID } from "@/lib/constantes";
import { useExigirLogin } from "@/lib/usar-exigir-login";
import {
  hojeSP,
  minutosDoHorario,
  dataEHoraParaISO,
  inicioDoDiaUTC,
  fimDoDiaUTC,
  minutosDoDiaSP,
} from "@/lib/data-sp";
import { calcularHorariosLivres, agruparPorPeriodo, minutosParaHora } from "@/lib/horarios";
import { centavosParaReais } from "@/lib/dinheiro";
import { linkWhatsApp, preencherModelo } from "@/lib/whatsapp";

type Profissional = {
  id: string;
  nome: string;
  horario_abertura: string;
  horario_fechamento: string;
};
type Servico = { id: string; nome: string; duracao_minutos: number; preco_centavos: number };
type Cliente = { id: string; nome: string; telefone: string };
type ModeloMensagem = { id: string; titulo: string; texto: string };

type AgendamentoCriado = {
  nomeCliente: string;
  telefoneCliente: string;
  nomeProfissional: string;
  horario: string;
};

export default function PaginaNovoAgendamento() {
  return (
    <Suspense fallback={<p className="p-6 text-texto-secundario">Carregando...</p>}>
      <FormularioNovoAgendamento />
    </Suspense>
  );
}

function FormularioNovoAgendamento() {
  const { pronto, perfil, ehDono } = useExigirLogin();
  const parametros = useSearchParams();

  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const [profissionalId, setProfissionalId] = useState(
    parametros.get("profissional") ?? "",
  );
  const [servicoId, setServicoId] = useState("");
  const [data, setData] = useState(parametros.get("data") ?? hojeSP());
  const [minutoEscolhido, setMinutoEscolhido] = useState<number | null>(null);
  const [horariosOcupados, setHorariosOcupados] = useState<
    { inicioMin: number; fimMin: number }[]
  >([]);

  const [buscaCliente, setBuscaCliente] = useState("");
  const [clientesEncontrados, setClientesEncontrados] = useState<Cliente[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [nomeNovoCliente, setNomeNovoCliente] = useState("");

  const [modelos, setModelos] = useState<ModeloMensagem[]>([]);
  const [modeloId, setModeloId] = useState("");
  const [criado, setCriado] = useState<AgendamentoCriado | null>(null);

  useEffect(() => {
    if (!pronto) return;
     
    (async () => {
      const [resProf, resServ, resModelos] = await Promise.all([
        supabase
          .from("profissional")
          .select("id, nome, horario_abertura, horario_fechamento")
          .eq("ativo", true)
          .order("nome"),
        supabase
          .from("servico")
          .select("id, nome, duracao_minutos, preco_centavos")
          .eq("ativo", true)
          .order("nome"),
        supabase
          .from("modelo_mensagem")
          .select("id, titulo, texto")
          .eq("ativo", true)
          .order("titulo"),
      ]);
      if (resModelos.data) {
        setModelos(resModelos.data);
        setModeloId(resModelos.data[0]?.id ?? "");
      }
      if (resProf.data) {
        // Um profissional comum só marca horário na própria cadeira —
        // dono e recepção continuam vendo todo mundo, porque marcam pra
        // qualquer um. Sem esse filtro, a pessoa escolhia um colega e só
        // descobria que não podia na hora de salvar (erro de permissão).
        const listaVisivel =
          ehDono || perfil?.papel === "recepcao"
            ? resProf.data
            : resProf.data.filter((p) => p.id === perfil?.profissional_id);
        setProfissionais(listaVisivel);
        if (!ehDono && perfil?.papel !== "recepcao" && listaVisivel.length === 1) {
          setProfissionalId(listaVisivel[0].id);
        }
      }
      if (resServ.data) setServicos(resServ.data);
    })();
  }, [pronto, ehDono, perfil?.papel, perfil?.profissional_id]);

  // Recarrega os horários já ocupados sempre que trocar profissional/data.
  useEffect(() => {
    if (!profissionalId || !data) return;
     
    (async () => {
      setMinutoEscolhido(null);
      const { data: agendamentosDoDia, error } = await supabase
        .from("agendamento")
        .select("data_hora_inicio, duracao_minutos")
        .eq("profissional_id", profissionalId)
        .neq("status", "cancelado")
        .gte("data_hora_inicio", inicioDoDiaUTC(data))
        .lte("data_hora_inicio", fimDoDiaUTC(data));

      if (error) {
        setErro(error.message);
        return;
      }

      setHorariosOcupados(
        (agendamentosDoDia ?? []).map((a) => {
          const inicioMin = minutosDoDiaSP(a.data_hora_inicio);
          return { inicioMin, fimMin: inicioMin + a.duracao_minutos };
        }),
      );
    })();
  }, [profissionalId, data]);

  async function buscarCliente() {
    if (!buscaCliente.trim()) {
      setClientesEncontrados([]);
      return;
    }
    const { data: encontrados, error } = await supabase
      .from("cliente")
      .select("id, nome, telefone")
      .or(`nome.ilike.%${buscaCliente}%,telefone.ilike.%${buscaCliente}%`)
      .limit(5);

    if (error) {
      setErro(error.message);
      return;
    }
    setClientesEncontrados(encontrados ?? []);
  }

  const profissional = profissionais.find((p) => p.id === profissionalId);
  const servico = servicos.find((s) => s.id === servicoId);

  const horariosLivres = useMemo(() => {
    if (!profissional || !servico) return { manha: [], tarde: [], noite: [] };
    const livres = calcularHorariosLivres(
      minutosDoHorario(profissional.horario_abertura),
      minutosDoHorario(profissional.horario_fechamento),
      horariosOcupados,
      servico.duracao_minutos,
    );
    return agruparPorPeriodo(livres);
  }, [profissional, servico, horariosOcupados]);

  const clientePronto = clienteSelecionado || (buscaCliente && nomeNovoCliente);
  const podeSalvar =
    profissionalId && servicoId && minutoEscolhido !== null && clientePronto;

  async function salvar() {
    if (!podeSalvar || !servico) return;
    setSalvando(true);
    setErro(null);

    try {
      let clienteId = clienteSelecionado?.id;

      if (!clienteId) {
        // upsert por telefone: se a pessoa digitou o telefone de alguém já
        // cadastrado sem esperar a busca achar, isso acha em vez de tentar
        // duplicar e quebrar no telefone único.
        const { data: novoCliente, error: erroCliente } = await supabase
          .from("cliente")
          .upsert(
            { tenant_id: TENANT_ID, nome: nomeNovoCliente, telefone: buscaCliente },
            { onConflict: "tenant_id,telefone" },
          )
          .select("id")
          .single();
        if (erroCliente) throw erroCliente;
        clienteId = novoCliente.id;
      }

      const { error: erroAgendamento } = await supabase.from("agendamento").insert({
        tenant_id: TENANT_ID,
        profissional_id: profissionalId,
        servico_id: servicoId,
        cliente_id: clienteId,
        duracao_minutos: servico.duracao_minutos,
        data_hora_inicio: dataEHoraParaISO(data, minutoEscolhido as number),
        origem: "interno",
      });
      if (erroAgendamento) throw erroAgendamento;

      setCriado({
        nomeCliente: clienteSelecionado?.nome ?? nomeNovoCliente,
        telefoneCliente: buscaCliente,
        nomeProfissional: profissional?.nome ?? "",
        horario: `${minutosParaHora(minutoEscolhido as number)} de ${data.split("-").reverse().join("/")}`,
      });
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não deu certo, tenta de novo.");
    } finally {
      setSalvando(false);
    }
  }

  async function mandarConfirmacao() {
    const modelo = modelos.find((m) => m.id === modeloId);
    if (!modelo || !criado) return;

    const texto = preencherModelo(modelo.texto, {
      cliente: criado.nomeCliente,
      horario: criado.horario,
      profissional: criado.nomeProfissional,
    });

    window.open(linkWhatsApp(criado.telefoneCliente, texto), "_blank", "noopener");

    await supabase.from("mensagem_enviada").insert({
      tenant_id: TENANT_ID,
      modelo_mensagem_id: modelo.id,
      destinatario_telefone: criado.telefoneCliente,
    });
  }

  if (!pronto) return <p className="p-6 text-texto-secundario">Carregando...</p>;

  if (criado) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="titulo-marca text-2xl text-dourado">Agendado!</h1>
        <div className="divisoria-metalica w-24" />
        <p className="max-w-xs text-texto-secundario">
          {criado.nomeCliente} · {criado.horario} com {criado.nomeProfissional}
        </p>

        {modelos.length > 0 && (
          <div className="flex w-full max-w-xs flex-col gap-3">
            <select
              value={modeloId}
              onChange={(e) => setModeloId(e.target.value)}
              className="rounded-lg border border-dourado-escuro bg-cartao px-4 py-3 text-base text-texto-principal outline-none focus-visible:ring-2 focus-visible:ring-dourado"
            >
              {modelos.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.titulo}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={mandarConfirmacao}
              className="rounded-lg bg-entrada py-3 font-bold text-fundo"
            >
              Mandar confirmação no WhatsApp
            </button>
          </div>
        )}

        <Link href={`/agenda?data=${data}`} className="text-dourado underline">
          Voltar pra agenda
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-8">
      <div>
        <Link href="/agenda" className="text-sm text-texto-secundario">
          ← Voltar pra agenda
        </Link>
        <h1 className="titulo-marca text-2xl text-dourado">Novo agendamento</h1>
      </div>
      <div className="divisoria-metalica" />

      {erro && <p className="text-alerta">{erro}</p>}

      <label className="flex flex-col gap-1 text-sm text-texto-secundario">
        Profissional
        <select
          value={profissionalId}
          onChange={(e) => setProfissionalId(e.target.value)}
          className="rounded-lg border border-dourado-escuro bg-cartao px-4 py-3 text-base text-texto-principal outline-none focus-visible:ring-2 focus-visible:ring-dourado"
        >
          <option value="">Selecione...</option>
          {profissionais.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm text-texto-secundario">
        Serviço
        <select
          value={servicoId}
          onChange={(e) => setServicoId(e.target.value)}
          className="rounded-lg border border-dourado-escuro bg-cartao px-4 py-3 text-base text-texto-principal outline-none focus-visible:ring-2 focus-visible:ring-dourado"
        >
          <option value="">Selecione...</option>
          {servicos.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nome} · {s.duracao_minutos}min · R$ {centavosParaReais(s.preco_centavos)}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm text-texto-secundario">
        Data
        <input
          type="date"
          value={data}
          onChange={(e) => setData(e.target.value)}
          className="rounded-lg border border-dourado-escuro bg-cartao px-4 py-3 text-base text-texto-principal outline-none focus-visible:ring-2 focus-visible:ring-dourado"
        />
      </label>

      <div className="flex flex-col gap-2 text-sm text-texto-secundario">
        Cliente
        <input
          type="text"
          placeholder="Nome ou telefone"
          value={buscaCliente}
          onChange={(e) => {
            setBuscaCliente(e.target.value);
            setClienteSelecionado(null);
          }}
          onBlur={buscarCliente}
          className="rounded-lg border border-dourado-escuro bg-cartao px-4 py-3 text-base text-texto-principal outline-none focus-visible:ring-2 focus-visible:ring-dourado"
        />

        {!clienteSelecionado && clientesEncontrados.length > 0 && (
          <ul className="flex flex-col gap-2">
            {clientesEncontrados.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => {
                    setClienteSelecionado(c);
                    setBuscaCliente(c.telefone);
                    setClientesEncontrados([]);
                  }}
                  className="w-full rounded-lg bg-cartao px-4 py-2 text-left text-texto-principal"
                >
                  {c.nome} · {c.telefone}
                </button>
              </li>
            ))}
          </ul>
        )}

        {!clienteSelecionado && buscaCliente && clientesEncontrados.length === 0 && (
          <input
            type="text"
            placeholder="Cliente novo — nome completo"
            value={nomeNovoCliente}
            onChange={(e) => setNomeNovoCliente(e.target.value)}
            className="rounded-lg border border-dourado-escuro bg-cartao px-4 py-3 text-base text-texto-principal outline-none focus-visible:ring-2 focus-visible:ring-dourado"
          />
        )}

        {clienteSelecionado && (
          <p className="text-champanhe">
            Selecionado: {clienteSelecionado.nome}
          </p>
        )}
      </div>

      {profissional && servico && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-texto-secundario">Horário</p>
          <BlocoHorarios titulo="Manhã" minutos={horariosLivres.manha} selecionado={minutoEscolhido} aoEscolher={setMinutoEscolhido} />
          <BlocoHorarios titulo="Tarde" minutos={horariosLivres.tarde} selecionado={minutoEscolhido} aoEscolher={setMinutoEscolhido} />
          <BlocoHorarios titulo="Noite" minutos={horariosLivres.noite} selecionado={minutoEscolhido} aoEscolher={setMinutoEscolhido} />
          {horariosLivres.manha.length + horariosLivres.tarde.length + horariosLivres.noite.length === 0 && (
            <p className="text-texto-secundario">
              Sem horário livre nesse dia para esse serviço.
            </p>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={salvar}
        disabled={!podeSalvar || salvando}
        className="rounded-lg bg-dourado py-3 text-base font-bold text-fundo disabled:opacity-40"
      >
        {salvando ? "Salvando..." : "Confirmar agendamento"}
      </button>
    </div>
  );
}

function BlocoHorarios({
  titulo,
  minutos,
  selecionado,
  aoEscolher,
}: {
  titulo: string;
  minutos: number[];
  selecionado: number | null;
  aoEscolher: (m: number) => void;
}) {
  if (minutos.length === 0) return null;
  return (
    <div>
      <p className="mb-2 text-xs uppercase tracking-wide text-texto-secundario">
        {titulo}
      </p>
      <div className="flex flex-wrap gap-2">
        {minutos.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => aoEscolher(m)}
            className={`rounded-lg px-3 py-2 text-sm font-semibold ${
              selecionado === m
                ? "bg-dourado text-fundo"
                : "bg-cartao text-texto-principal"
            }`}
          >
            {minutosParaHora(m)}
          </button>
        ))}
      </div>
    </div>
  );
}
