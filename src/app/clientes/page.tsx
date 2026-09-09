"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { TENANT_ID } from "@/lib/constantes";
import { useExigirLogin } from "@/lib/usar-exigir-login";

type Cliente = {
  id: string;
  nome: string;
  telefone: string;
};

export default function PaginaClientes() {
  const { pronto } = useExigirLogin();
  const [lista, setLista] = useState<Cliente[] | null>(null);
  const [busca, setBusca] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarFormNovo, setMostrarFormNovo] = useState(false);

  async function carregar() {
    const { data, error } = await supabase
      .from("cliente")
      .select("id, nome, telefone")
      .order("nome");

    if (error) {
      setErro(error.message);
      return;
    }
    setLista(data);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- busca inicial ao entrar na tela
    if (pronto) carregar();
  }, [pronto]);

  if (!pronto) return <p className="p-6 text-texto-secundario">Carregando...</p>;

  const filtrada = lista?.filter(
    (c) =>
      c.nome.toLowerCase().includes(busca.toLowerCase()) ||
      c.telefone.includes(busca),
  );

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-8">
      <div>
        <Link href="/" className="text-sm text-texto-secundario">
          ← Voltar
        </Link>
        <h1 className="titulo-marca text-2xl text-dourado">Clientes</h1>
      </div>
      <div className="divisoria-metalica" />

      {erro && <p className="text-alerta">{erro}</p>}

      <input
        type="search"
        placeholder="Buscar por nome ou telefone"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        className="rounded-lg border border-dourado-escuro bg-cartao px-4 py-3 text-base text-texto-principal outline-none focus-visible:ring-2 focus-visible:ring-dourado"
      />

      <ul className="flex flex-col gap-3">
        {filtrada?.map((c) => (
          <li key={c.id} className="rounded-xl bg-cartao px-5 py-4">
            <p className="text-lg font-semibold">{c.nome}</p>
            <p className="text-sm text-texto-secundario">{c.telefone}</p>
          </li>
        ))}
        {filtrada?.length === 0 && (
          <p className="text-texto-secundario">Nenhum cliente encontrado.</p>
        )}
      </ul>

      {mostrarFormNovo ? (
        <FormNovoCliente
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
          + Novo cliente
        </button>
      )}
    </div>
  );
}

function FormNovoCliente({
  aoCriar,
  aoCancelar,
}: {
  aoCriar: () => void;
  aoCancelar: () => void;
}) {
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    setSalvando(true);
    setErro(null);

    const { error } = await supabase.from("cliente").insert({
      tenant_id: TENANT_ID,
      nome,
      telefone,
    });

    setSalvando(false);
    if (error) {
      setErro(
        error.message.includes("cliente_telefone_unico")
          ? "Já existe um cliente com esse telefone."
          : error.message,
      );
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
        Nome
        <input
          type="text"
          required
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="rounded-lg border border-dourado-escuro bg-fundo px-4 py-3 text-base text-texto-principal outline-none focus-visible:ring-2 focus-visible:ring-dourado"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-texto-secundario">
        Telefone (com DDD)
        <input
          type="tel"
          required
          placeholder="11999999999"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
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
