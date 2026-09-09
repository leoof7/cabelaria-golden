"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { TENANT_ID } from "@/lib/constantes";
import {
  hojeSP,
  somarDias,
  minutosDoHorario,
  dataEHoraParaISO,
  inicioDoDiaUTC,
  fimDoDiaUTC,
  minutosDoDiaSP,
  formatarDataExtensoSP,
} from "@/lib/data-sp";
import { calcularHorariosLivres, agruparPorPeriodo, minutosParaHora } from "@/lib/horarios";
import { centavosParaReais } from "@/lib/dinheiro";

type Profissional = {
  id: string;
  nome: string;
  horario_abertura: string;
  horario_fechamento: string;
};
type Servico = { id: string; nome: string; duracao_minutos: number; preco_centavos: number };

export default function PaginaAgendarPublico() {
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);

  const [servicoId, setServicoId] = useState("");
  const [profissionalId, setProfissionalId] = useState("");
  const [data, setData] = useState(hojeSP());
  const [minutoEscolhido, setMinutoEscolhido] = useState<number | null>(null);
  const [horariosOcupados, setHorariosOcupados] = useState<
    { inicioMin: number; fimMin: number }[]
  >([]);

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmado, setConfirmado] = useState<"agendado" | "fila" | null>(null);

  useEffect(() => {
    (async () => {
      const [resProf, resServ] = await Promise.all([
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
      ]);
      if (resProf.data) setProfissionais(resProf.data);
      if (resServ.data) setServicos(resServ.data);
    })();
  }, []);

  useEffect(() => {
    if (!profissionalId || !data) return;

    (async () => {
      setMinutoEscolhido(null);
      const { data: doDia } = await supabase
        .from("agendamento")
        .select("data_hora_inicio, duracao_minutos")
        .eq("profissional_id", profissionalId)
        .gte("data_hora_inicio", inicioDoDiaUTC(data))
        .lte("data_hora_inicio", fimDoDiaUTC(data));

      setHorariosOcupados(
        (doDia ?? []).map((a) => {
          const inicioMin = minutosDoDiaSP(a.data_hora_inicio);
          return { inicioMin, fimMin: inicioMin + a.duracao_minutos };
        }),
      );
    })();
  }, [profissionalId, data]);

  const profissional = profissionais.find((p) => p.id === profissionalId);
  const servico = servicos.find((s) => s.id === servicoId);

  const horariosLivres = useMemo(() => {
    if (!profissional || !servico) return { manha: [], tarde: [], noite: [] };
    const agoraMin = data === hojeSP() ? minutosDoDiaSP(new Date().toISOString()) : 0;
    const livres = calcularHorariosLivres(
      Math.max(minutosDoHorario(profissional.horario_abertura), agoraMin),
      minutosDoHorario(profissional.horario_fechamento),
      horariosOcupados,
      servico.duracao_minutos,
    );
    return agruparPorPeriodo(livres);
  }, [profissional, servico, horariosOcupados, data]);

  const totalLivres =
    horariosLivres.manha.length + horariosLivres.tarde.length + horariosLivres.noite.length;

  async function confirmarAgendamento() {
    if (!servico || minutoEscolhido === null || !nome || !telefone) return;
    setEnviando(true);
    setErro(null);

    try {
      const { data: clienteId, error: erroCliente } = await supabase.rpc(
        "cliente_upsert_publico",
        { p_nome: nome, p_telefone: telefone },
      );
      if (erroCliente) throw erroCliente;

      const { error } = await supabase.from("agendamento").insert({
        tenant_id: TENANT_ID,
        profissional_id: profissionalId,
        servico_id: servicoId,
        cliente_id: clienteId,
        duracao_minutos: servico.duracao_minutos,
        data_hora_inicio: dataEHoraParaISO(data, minutoEscolhido),
        origem: "publico",
      });
      if (error) throw error;

      setConfirmado("agendado");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não deu certo, tenta de novo.");
    } finally {
      setEnviando(false);
    }
  }

  async function entrarNaFila() {
    if (!nome || !telefone) return;
    setEnviando(true);
    setErro(null);

    try {
      const { data: clienteId, error: erroCliente } = await supabase.rpc(
        "cliente_upsert_publico",
        { p_nome: nome, p_telefone: telefone },
      );
      if (erroCliente) throw erroCliente;

      const { error } = await supabase.from("fila").insert({
        tenant_id: TENANT_ID,
        profissional_id: profissionalId || null,
        servico_id: servicoId || null,
        cliente_id: clienteId,
      });
      if (error) throw error;

      setConfirmado("fila");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não deu certo, tenta de novo.");
    } finally {
      setEnviando(false);
    }
  }

  if (confirmado === "agendado") {
    return (
      <TelaFinal
        titulo="Agendado!"
        mensagem={`Seu horário é ${minutosParaHora(minutoEscolhido!)} de ${formatarDataExtensoSP(data)} com ${profissional?.nome}.`}
      />
    );
  }
  if (confirmado === "fila") {
    return (
      <TelaFinal
        titulo="Você entrou na fila"
        mensagem="Assim que abrir um horário, a Cabelaria Golden vai te chamar."
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-8">
      <div className="text-center">
        <h1 className="titulo-marca text-2xl text-dourado">Cabelaria Golden</h1>
        <p className="text-sm text-texto-secundario">Agende seu horário</p>
      </div>
      <div className="divisoria-metalica" />

      <SecaoEscolha
        titulo="1. Escolha o serviço"
        itens={servicos.map((s) => ({
          id: s.id,
          rotulo: `${s.nome} · ${s.duracao_minutos}min`,
        }))}
        selecionado={servicoId}
        aoEscolher={setServicoId}
      />

      {servicoId && (
        <SecaoEscolha
          titulo="2. Escolha o profissional"
          itens={profissionais.map((p) => ({ id: p.id, rotulo: p.nome }))}
          selecionado={profissionalId}
          aoEscolher={setProfissionalId}
        />
      )}

      {servicoId && profissionalId && (
        <div>
          <p className="mb-2 text-sm text-texto-secundario">3. Escolha o dia</p>
          <div className="flex items-center justify-between gap-3 rounded-xl bg-cartao px-4 py-3">
            <button
              type="button"
              onClick={() => setData((d) => somarDias(d, -1))}
              disabled={data === hojeSP()}
              className="rounded-lg border border-dourado-escuro px-3 py-2 text-dourado disabled:opacity-30"
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
            >
              →
            </button>
          </div>
        </div>
      )}

      {servicoId && profissionalId && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-texto-secundario">4. Escolha o horário</p>
          <BlocoHorarios titulo="Manhã" minutos={horariosLivres.manha} selecionado={minutoEscolhido} aoEscolher={setMinutoEscolhido} />
          <BlocoHorarios titulo="Tarde" minutos={horariosLivres.tarde} selecionado={minutoEscolhido} aoEscolher={setMinutoEscolhido} />
          <BlocoHorarios titulo="Noite" minutos={horariosLivres.noite} selecionado={minutoEscolhido} aoEscolher={setMinutoEscolhido} />

          {totalLivres === 0 && (
            <div className="flex flex-col gap-3 rounded-xl bg-cartao px-5 py-4 text-center">
              <p className="text-texto-secundario">
                Sem horário livre nesse dia para esse serviço.
              </p>
              <CamposContato nome={nome} telefone={telefone} setNome={setNome} setTelefone={setTelefone} />
              {erro && <p className="text-sm text-alerta">{erro}</p>}
              <button
                type="button"
                onClick={entrarNaFila}
                disabled={enviando || !nome || !telefone}
                className="rounded-lg border border-dourado py-3 font-bold text-dourado disabled:opacity-40"
              >
                {enviando ? "Um instante..." : "Entrar na fila de espera"}
              </button>
            </div>
          )}
        </div>
      )}

      {servicoId && profissionalId && minutoEscolhido !== null && (
        <div className="flex flex-col gap-3 rounded-xl bg-cartao px-5 py-4">
          <p className="text-sm text-texto-secundario">5. Seus dados</p>
          <CamposContato nome={nome} telefone={telefone} setNome={setNome} setTelefone={setTelefone} />

          {servico && (
            <p className="text-xs text-texto-secundario">
              {servico.nome} · {minutosParaHora(minutoEscolhido)} de{" "}
              {formatarDataExtensoSP(data)} · R$ {centavosParaReais(servico.preco_centavos)}
            </p>
          )}

          {erro && <p className="text-sm text-alerta">{erro}</p>}

          <button
            type="button"
            onClick={confirmarAgendamento}
            disabled={enviando || !nome || !telefone}
            className="rounded-lg bg-dourado py-3 font-bold text-fundo disabled:opacity-40"
          >
            {enviando ? "Um instante..." : "Confirmar agendamento"}
          </button>
        </div>
      )}
    </div>
  );
}

function SecaoEscolha({
  titulo,
  itens,
  selecionado,
  aoEscolher,
}: {
  titulo: string;
  itens: { id: string; rotulo: string }[];
  selecionado: string;
  aoEscolher: (id: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-sm text-texto-secundario">{titulo}</p>
      <div className="flex flex-wrap gap-2">
        {itens.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => aoEscolher(item.id)}
            className={`rounded-lg px-4 py-3 text-sm font-semibold ${
              selecionado === item.id ? "bg-dourado text-fundo" : "bg-cartao text-texto-principal"
            }`}
          >
            {item.rotulo}
          </button>
        ))}
      </div>
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
      <p className="mb-2 text-xs uppercase tracking-wide text-texto-secundario">{titulo}</p>
      <div className="flex flex-wrap gap-2">
        {minutos.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => aoEscolher(m)}
            className={`rounded-lg px-3 py-2 text-sm font-semibold ${
              selecionado === m ? "bg-dourado text-fundo" : "bg-cartao text-texto-principal"
            }`}
          >
            {minutosParaHora(m)}
          </button>
        ))}
      </div>
    </div>
  );
}

function CamposContato({
  nome,
  telefone,
  setNome,
  setTelefone,
}: {
  nome: string;
  telefone: string;
  setNome: (v: string) => void;
  setTelefone: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3 text-left">
      <label className="flex flex-col gap-1 text-sm text-texto-secundario">
        Nome
        <input
          type="text"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="rounded-lg border border-dourado-escuro bg-fundo px-4 py-3 text-base text-texto-principal outline-none focus-visible:ring-2 focus-visible:ring-dourado"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-texto-secundario">
        WhatsApp (com DDD)
        <input
          type="tel"
          placeholder="11999999999"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
          className="rounded-lg border border-dourado-escuro bg-fundo px-4 py-3 text-base text-texto-principal outline-none focus-visible:ring-2 focus-visible:ring-dourado"
        />
      </label>
    </div>
  );
}

function TelaFinal({ titulo, mensagem }: { titulo: string; mensagem: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="titulo-marca text-2xl text-dourado">{titulo}</h1>
      <div className="divisoria-metalica w-24" />
      <p className="max-w-xs text-texto-secundario">{mensagem}</p>
    </div>
  );
}
