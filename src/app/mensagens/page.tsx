"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { TENANT_ID } from "@/lib/constantes";
import { useExigirLogin } from "@/lib/usar-exigir-login";

type ModeloMensagem = {
  id: string;
  titulo: string;
  texto: string;
  ativo: boolean;
};

export default function PaginaMensagens() {
  const { pronto, ehDono } = useExigirLogin();
  const [lista, setLista] = useState<ModeloMensagem[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarFormNovo, setMostrarFormNovo] = useState(false);

  async function carregar() {
    const { data, error } = await supabase
      .from("modelo_mensagem")
      .select("id, titulo, texto, ativo")
      .order("titulo");

    if (error) {
      setErro(error.message);
      return;
    }
    setLista(data);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- busca inicial ao entrar na tela
    if (pronto && ehDono) carregar();
  }, [pronto, ehDono]);

  if (!pronto) return <p className="p-6 text-texto-secundario">Carregando...</p>;

  if (!ehDono) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-texto-secundario">
          Só o dono edita os modelos de mensagem.
        </p>
        <Link href="/" className="text-dourado underline">
          Voltar
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-8">
      <div>
        <Link href="/" className="text-sm text-texto-secundario">
          ← Voltar
        </Link>
        <h1 className="titulo-marca text-2xl text-dourado">Mensagens prontas</h1>
        <p className="mt-1 text-xs text-texto-secundario">
          Use {"{{cliente}}"}, {"{{horario}}"} e {"{{profissional}}"} — o
          sistema troca pelo dado real na hora de mandar.
        </p>
      </div>
      <div className="divisoria-metalica" />

      {erro && <p className="text-alerta">{erro}</p>}

      <ul className="flex flex-col gap-3">
        {lista?.map((m) => (
          <CartaoModelo key={m.id} modelo={m} aoSalvar={carregar} />
        ))}
      </ul>

      {mostrarFormNovo ? (
        <FormNovoModelo
          aoCriar={() => {
            setMostrarFormNovo(false);
            carregar();
          }}
          aoCancelar={() => setMostrarFormNovo(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setMostrarFormNovo(true)}
          className="rounded-lg bg-dourado py-3 text-base font-bold text-fundo"
        >
          + Novo modelo
        </button>
      )}
    </div>
  );
}

function CartaoModelo({
  modelo,
  aoSalvar,
}: {
  modelo: ModeloMensagem;
  aoSalvar: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const [titulo, setTitulo] = useState(modelo.titulo);
  const [texto, setTexto] = useState(modelo.texto);
  const [ativo, setAtivo] = useState(modelo.ativo);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    setSalvando(true);
    setErro(null);

    const { error } = await supabase
      .from("modelo_mensagem")
      .update({ titulo, texto, ativo })
      .eq("id", modelo.id);

    setSalvando(false);
    if (error) {
      setErro(error.message);
      return;
    }
    setEditando(false);
    aoSalvar();
  }

  if (!editando) {
    return (
      <li className="rounded-xl bg-cartao px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-lg font-semibold">
              {modelo.titulo}
              {!modelo.ativo && " · inativo"}
            </p>
            <p className="text-sm text-texto-secundario">{modelo.texto}</p>
          </div>
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="shrink-0 rounded-lg border border-dourado-escuro px-4 py-2 text-sm font-semibold text-dourado"
          >
            Editar
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="rounded-xl bg-cartao px-5 py-4">
      <form onSubmit={salvar} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm text-texto-secundario">
          Título
          <input
            type="text"
            required
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            className="rounded-lg border border-dourado-escuro bg-fundo px-4 py-3 text-base text-texto-principal outline-none focus-visible:ring-2 focus-visible:ring-dourado"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-texto-secundario">
          Texto
          <textarea
            required
            rows={3}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            className="rounded-lg border border-dourado-escuro bg-fundo px-4 py-3 text-base text-texto-principal outline-none focus-visible:ring-2 focus-visible:ring-dourado"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-texto-secundario">
          <input
            type="checkbox"
            checked={ativo}
            onChange={(e) => setAtivo(e.target.checked)}
            className="h-5 w-5 accent-dourado"
          />
          Ativo
        </label>

        {erro && <p className="text-sm text-alerta">{erro}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={salvando}
            className="flex-1 rounded-lg bg-dourado py-2 font-bold text-fundo disabled:opacity-60"
          >
            Salvar
          </button>
          <button
            type="button"
            onClick={() => setEditando(false)}
            className="flex-1 rounded-lg border border-dourado-escuro py-2 font-semibold text-texto-secundario"
          >
            Cancelar
          </button>
        </div>
      </form>
    </li>
  );
}

function FormNovoModelo({
  aoCriar,
  aoCancelar,
}: {
  aoCriar: () => void;
  aoCancelar: () => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    setSalvando(true);
    setErro(null);

    const { error } = await supabase.from("modelo_mensagem").insert({
      tenant_id: TENANT_ID,
      titulo,
      texto,
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
        Título
        <input
          type="text"
          required
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          className="rounded-lg border border-dourado-escuro bg-fundo px-4 py-3 text-base text-texto-principal outline-none focus-visible:ring-2 focus-visible:ring-dourado"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-texto-secundario">
        Texto (use {"{{cliente}}"}, {"{{horario}}"}, {"{{profissional}}"})
        <textarea
          required
          rows={3}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          className="rounded-lg border border-dourado-escuro bg-fundo px-4 py-3 text-base text-texto-principal outline-none focus-visible:ring-2 focus-visible:ring-dourado"
        />
      </label>

      {erro && <p className="text-sm text-alerta">{erro}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={salvando}
          className="flex-1 rounded-lg bg-dourado py-2 font-bold text-fundo disabled:opacity-60"
        >
          Criar
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
