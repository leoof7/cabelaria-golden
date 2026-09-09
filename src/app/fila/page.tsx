"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { TENANT_ID } from "@/lib/constantes";
import { useExigirLogin } from "@/lib/usar-exigir-login";
import { linkWhatsApp, preencherModelo } from "@/lib/whatsapp";

type StatusFila = "esperando" | "chamado" | "atendido" | "desistiu";

type ItemFila = {
  id: string;
  profissional_id: string | null;
  status: StatusFila;
  entrou_em: string;
  nome_profissional: string;
  nome_cliente: string;
  telefone_cliente: string;
  nome_servico: string | null;
};

type Profissional = { id: string; nome: string };
type Servico = { id: string; nome: string };
type Cliente = { id: string; nome: string; telefone: string };
type ModeloMensagem = { id: string; titulo: string; texto: string };

export default function PaginaFila() {
  const { pronto } = useExigirLogin();
  const [itens, setItens] = useState<ItemFila[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [modelos, setModelos] = useState<ModeloMensagem[]>([]);

  async function carregar() {
    const { data, error } = await supabase
      .from("fila")
      .select(
        "id, profissional_id, status, entrou_em, " +
          "profissional:profissional_id(nome), cliente:cliente_id(nome, telefone), servico:servico_id(nome)",
      )
      .in("status", ["esperando", "chamado"])
      .order("entrou_em");

    if (error) {
      setErro(error.message);
      return;
    }

    setItens(
      (data ?? []).map((linha) => {
        const linhaAny = linha as unknown as {
          id: string;
          profissional_id: string | null;
          status: StatusFila;
          entrou_em: string;
          profissional: { nome: string } | { nome: string }[] | null;
          cliente: { nome: string; telefone: string } | { nome: string; telefone: string }[] | null;
          servico: { nome: string } | { nome: string }[] | null;
        };
        const um = <T,>(v: T | T[] | null) => (Array.isArray(v) ? v[0] : v);
        return {
          id: linhaAny.id,
          profissional_id: linhaAny.profissional_id,
          status: linhaAny.status,
          entrou_em: linhaAny.entrou_em,
          nome_profissional: um(linhaAny.profissional)?.nome ?? "Qualquer profissional",
          nome_cliente: um(linhaAny.cliente)?.nome ?? "Cliente",
          telefone_cliente: um(linhaAny.cliente)?.telefone ?? "",
          nome_servico: um(linhaAny.servico)?.nome ?? null,
        };
      }),
    );
  }

  useEffect(() => {
    if (!pronto) return;

    (async () => {
      await carregar();
      const [resProf, resServ, resModelos] = await Promise.all([
        supabase.from("profissional").select("id, nome").eq("ativo", true).order("nome"),
        supabase.from("servico").select("id, nome").eq("ativo", true).order("nome"),
        supabase.from("modelo_mensagem").select("id, titulo, texto").eq("ativo", true),
      ]);
      if (resProf.data) setProfissionais(resProf.data);
      if (resServ.data) setServicos(resServ.data);
      if (resModelos.data) setModelos(resModelos.data);
    })();
  }, [pronto]);

  // Tenta achar um modelo pensado pra fila; se não tiver nenhum com esse
  // nome, usa o primeiro modelo ativo que existir.
  const modeloDaFila =
    modelos.find((m) => m.titulo.toLowerCase().includes("fila")) ?? modelos[0];

  function avisarNoWhatsApp(item: ItemFila) {
    if (!modeloDaFila || !item.telefone_cliente) return;
    const texto = preencherModelo(modeloDaFila.texto, {
      cliente: item.nome_cliente,
      profissional: item.nome_profissional,
    });
    window.open(linkWhatsApp(item.telefone_cliente, texto), "_blank", "noopener");
  }

  async function mudarStatus(id: string, status: StatusFila) {
    const { error } = await supabase.from("fila").update({ status }).eq("id", id);
    if (error) {
      setErro(error.message);
      return;
    }
    carregar();
  }

  if (!pronto) return <p className="p-6 text-texto-secundario">Carregando...</p>;

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-8">
      <div>
        <Link href="/" className="text-sm text-texto-secundario">
          ← Voltar
        </Link>
        <h1 className="titulo-marca text-2xl text-dourado">Fila de espera</h1>
      </div>
      <div className="divisoria-metalica" />

      {erro && <p className="text-alerta">{erro}</p>}

      <ul className="flex flex-col gap-3">
        {itens.map((item) => (
          <li key={item.id} className="rounded-xl bg-cartao px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-lg font-semibold">{item.nome_cliente}</p>
                <p className="text-sm text-texto-secundario">
                  {item.nome_profissional}
                  {item.nome_servico && ` · ${item.nome_servico}`}
                  {item.status === "chamado" && " · chamado"}
                </p>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                {item.status === "esperando" && (
                  <button
                    type="button"
                    onClick={() => mudarStatus(item.id, "chamado")}
                    className="rounded-lg bg-dourado px-3 py-2 text-xs font-bold text-fundo"
                  >
                    Chamar
                  </button>
                )}
                {modeloDaFila && item.telefone_cliente && (
                  <button
                    type="button"
                    onClick={() => avisarNoWhatsApp(item)}
                    className="rounded-lg border border-entrada px-3 py-2 text-xs font-bold text-entrada"
                  >
                    Avisar no WhatsApp
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => mudarStatus(item.id, "atendido")}
                  className="rounded-lg border border-entrada px-3 py-2 text-xs font-bold text-entrada"
                >
                  Atendido
                </button>
                <button
                  type="button"
                  onClick={() => mudarStatus(item.id, "desistiu")}
                  className="rounded-lg border border-alerta px-3 py-2 text-xs font-bold text-alerta"
                >
                  Desistiu
                </button>
              </div>
            </div>
          </li>
        ))}
        {itens.length === 0 && (
          <p className="text-texto-secundario">Ninguém esperando agora.</p>
        )}
      </ul>

      {mostrarForm ? (
        <FormEntrarNaFila
          profissionais={profissionais}
          servicos={servicos}
          aoCriar={() => {
            setMostrarForm(false);
            carregar();
          }}
          aoCancelar={() => setMostrarForm(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setMostrarForm(true)}
          className="rounded-lg bg-dourado py-3 text-base font-bold text-fundo"
        >
          + Adicionar à fila
        </button>
      )}
    </div>
  );
}

function FormEntrarNaFila({
  profissionais,
  servicos,
  aoCriar,
  aoCancelar,
}: {
  profissionais: Profissional[];
  servicos: Servico[];
  aoCriar: () => void;
  aoCancelar: () => void;
}) {
  const [profissionalId, setProfissionalId] = useState("");
  const [servicoId, setServicoId] = useState("");
  const [busca, setBusca] = useState("");
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [encontrados, setEncontrados] = useState<Cliente[]>([]);
  const [nomeNovoCliente, setNomeNovoCliente] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function buscar() {
    if (!busca.trim()) return;
    const { data } = await supabase
      .from("cliente")
      .select("id, nome, telefone")
      .or(`nome.ilike.%${busca}%,telefone.ilike.%${busca}%`)
      .limit(5);
    setEncontrados(data ?? []);
  }

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    setSalvando(true);
    setErro(null);

    try {
      let clienteId = clienteSelecionado?.id;
      if (!clienteId) {
        // upsert por telefone — evita duplicar se a busca não tiver achado
        // a tempo (mesmo raciocínio do novo agendamento).
        const { data: novo, error } = await supabase
          .from("cliente")
          .upsert(
            { tenant_id: TENANT_ID, nome: nomeNovoCliente, telefone: busca },
            { onConflict: "tenant_id,telefone" },
          )
          .select("id")
          .single();
        if (error) throw error;
        clienteId = novo.id;
      }

      const { error: erroFila } = await supabase.from("fila").insert({
        tenant_id: TENANT_ID,
        profissional_id: profissionalId || null,
        servico_id: servicoId || null,
        cliente_id: clienteId,
      });
      if (erroFila) throw erroFila;

      aoCriar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não deu certo, tenta de novo.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={salvar} className="flex flex-col gap-3 rounded-xl bg-cartao px-5 py-4">
      <label className="flex flex-col gap-1 text-sm text-texto-secundario">
        Profissional (opcional)
        <select
          value={profissionalId}
          onChange={(e) => setProfissionalId(e.target.value)}
          className="rounded-lg border border-dourado-escuro bg-fundo px-4 py-3 text-base text-texto-principal outline-none focus-visible:ring-2 focus-visible:ring-dourado"
        >
          <option value="">Qualquer profissional</option>
          {profissionais.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm text-texto-secundario">
        Serviço (opcional)
        <select
          value={servicoId}
          onChange={(e) => setServicoId(e.target.value)}
          className="rounded-lg border border-dourado-escuro bg-fundo px-4 py-3 text-base text-texto-principal outline-none focus-visible:ring-2 focus-visible:ring-dourado"
        >
          <option value="">Não sei ainda</option>
          {servicos.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nome}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm text-texto-secundario">
        Cliente (nome ou telefone)
        <input
          type="text"
          value={busca}
          onChange={(e) => {
            setBusca(e.target.value);
            setClienteSelecionado(null);
          }}
          onBlur={buscar}
          className="rounded-lg border border-dourado-escuro bg-fundo px-4 py-3 text-base text-texto-principal outline-none focus-visible:ring-2 focus-visible:ring-dourado"
        />
      </label>

      {!clienteSelecionado && encontrados.length > 0 && (
        <ul className="flex flex-col gap-2">
          {encontrados.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => {
                  setClienteSelecionado(c);
                  setBusca(c.telefone);
                  setEncontrados([]);
                }}
                className="w-full rounded-lg bg-fundo px-4 py-2 text-left"
              >
                {c.nome} · {c.telefone}
              </button>
            </li>
          ))}
        </ul>
      )}

      {!clienteSelecionado && busca && encontrados.length === 0 && (
        <input
          type="text"
          placeholder="Cliente novo — nome completo"
          value={nomeNovoCliente}
          onChange={(e) => setNomeNovoCliente(e.target.value)}
          className="rounded-lg border border-dourado-escuro bg-fundo px-4 py-3 text-base text-texto-principal outline-none focus-visible:ring-2 focus-visible:ring-dourado"
        />
      )}

      {erro && <p className="text-sm text-alerta">{erro}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={salvando || !(clienteSelecionado || (busca && nomeNovoCliente))}
          className="flex-1 rounded-lg bg-dourado py-2 font-bold text-fundo disabled:opacity-60"
        >
          Adicionar
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
