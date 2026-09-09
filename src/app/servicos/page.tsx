"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { TENANT_ID } from "@/lib/constantes";
import { centavosParaReais, reaisParaCentavos } from "@/lib/dinheiro";
import { useExigirLogin } from "@/lib/usar-exigir-login";

type Servico = {
  id: string;
  nome: string;
  duracao_minutos: number;
  preco_centavos: number;
  ativo: boolean;
};

export default function PaginaServicos() {
  const { pronto, ehDono } = useExigirLogin();
  const [lista, setLista] = useState<Servico[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarFormNovo, setMostrarFormNovo] = useState(false);

  async function carregar() {
    const { data, error } = await supabase
      .from("servico")
      .select("id, nome, duracao_minutos, preco_centavos, ativo")
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

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-8">
      <div>
        <Link href="/" className="text-sm text-texto-secundario">
          ← Voltar
        </Link>
        <h1 className="titulo-marca text-2xl text-dourado">Serviços</h1>
      </div>
      <div className="divisoria-metalica" />

      {erro && <p className="text-alerta">{erro}</p>}

      <ul className="flex flex-col gap-3">
        {lista?.map((s) => (
          <CartaoServico key={s.id} servico={s} ehDono={ehDono} aoSalvar={carregar} />
        ))}
      </ul>

      {ehDono && (
        <>
          {mostrarFormNovo ? (
            <FormNovoServico
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
              + Novo serviço
            </button>
          )}
        </>
      )}
    </div>
  );
}

function CartaoServico({
  servico,
  ehDono,
  aoSalvar,
}: {
  servico: Servico;
  ehDono: boolean;
  aoSalvar: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(servico.nome);
  const [duracao, setDuracao] = useState(String(servico.duracao_minutos));
  const [preco, setPreco] = useState(centavosParaReais(servico.preco_centavos));
  const [ativo, setAtivo] = useState(servico.ativo);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    setSalvando(true);
    setErro(null);

    const { error } = await supabase
      .from("servico")
      .update({
        nome,
        duracao_minutos: Number(duracao),
        preco_centavos: reaisParaCentavos(preco),
        ativo,
      })
      .eq("id", servico.id);

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
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-lg font-semibold">{servico.nome}</p>
            <p className="text-sm text-texto-secundario">
              {servico.duracao_minutos} min
              {!servico.ativo && " · inativo"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-lg font-bold text-champanhe">
              R$ {centavosParaReais(servico.preco_centavos)}
            </p>
            {ehDono && (
              <button
                type="button"
                onClick={() => setEditando(true)}
                className="rounded-lg border border-dourado-escuro px-4 py-2 text-sm font-semibold text-dourado"
              >
                Editar
              </button>
            )}
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className="rounded-xl bg-cartao px-5 py-4">
      <form onSubmit={salvar} className="flex flex-col gap-3">
        <CampoTexto label="Nome" value={nome} onChange={setNome} />
        <div className="flex gap-3">
          <CampoNumero label="Duração (min)" value={duracao} onChange={setDuracao} />
          <CampoTexto label="Preço (R$)" value={preco} onChange={setPreco} />
        </div>
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

function FormNovoServico({
  aoCriar,
  aoCancelar,
}: {
  aoCriar: () => void;
  aoCancelar: () => void;
}) {
  const [nome, setNome] = useState("");
  const [duracao, setDuracao] = useState("30");
  const [preco, setPreco] = useState("0,00");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    setSalvando(true);
    setErro(null);

    const { error } = await supabase.from("servico").insert({
      tenant_id: TENANT_ID,
      nome,
      duracao_minutos: Number(duracao),
      preco_centavos: reaisParaCentavos(preco),
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
      <CampoTexto label="Nome do serviço" value={nome} onChange={setNome} obrigatorio />
      <div className="flex gap-3">
        <CampoNumero label="Duração (min)" value={duracao} onChange={setDuracao} />
        <CampoTexto label="Preço (R$)" value={preco} onChange={setPreco} />
      </div>
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

function CampoTexto({
  label,
  value,
  onChange,
  obrigatorio,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  obrigatorio?: boolean;
}) {
  return (
    <label className="flex flex-1 flex-col gap-1 text-sm text-texto-secundario">
      {label}
      <input
        type="text"
        required={obrigatorio}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-dourado-escuro bg-fundo px-4 py-3 text-base text-texto-principal outline-none focus-visible:ring-2 focus-visible:ring-dourado"
      />
    </label>
  );
}

function CampoNumero({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-1 flex-col gap-1 text-sm text-texto-secundario">
      {label}
      <input
        type="number"
        min={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-dourado-escuro bg-fundo px-4 py-3 text-base text-texto-principal outline-none focus-visible:ring-2 focus-visible:ring-dourado"
      />
    </label>
  );
}
