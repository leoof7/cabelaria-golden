"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { TENANT_ID } from "@/lib/constantes";
import { useExigirLogin } from "@/lib/usar-exigir-login";

type Profissional = {
  id: string;
  nome: string;
  ativo: boolean;
  horario_abertura: string;
  horario_fechamento: string;
};

export default function PaginaProfissionais() {
  const { pronto, ehDono } = useExigirLogin();
  const [lista, setLista] = useState<Profissional[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarFormNovo, setMostrarFormNovo] = useState(false);

  async function carregar() {
    const { data, error } = await supabase
      .from("profissional")
      .select("id, nome, ativo, horario_abertura, horario_fechamento")
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
      <div className="flex items-center justify-between">
        <div>
          <Link href="/" className="text-sm text-texto-secundario">
            ← Voltar
          </Link>
          <h1 className="titulo-marca text-2xl text-dourado">Profissionais</h1>
        </div>
      </div>
      <div className="divisoria-metalica" />

      {erro && <p className="text-alerta">{erro}</p>}

      <ul className="flex flex-col gap-3">
        {lista?.map((p) => (
          <CartaoProfissional
            key={p.id}
            profissional={p}
            ehDono={ehDono}
            aoSalvar={carregar}
          />
        ))}
      </ul>

      {ehDono && (
        <>
          {mostrarFormNovo ? (
            <FormNovoProfissional
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
              + Nova cadeira
            </button>
          )}
        </>
      )}
    </div>
  );
}

function CartaoProfissional({
  profissional,
  ehDono,
  aoSalvar,
}: {
  profissional: Profissional;
  ehDono: boolean;
  aoSalvar: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(profissional.nome);
  const [abertura, setAbertura] = useState(profissional.horario_abertura);
  const [fechamento, setFechamento] = useState(profissional.horario_fechamento);
  const [ativo, setAtivo] = useState(profissional.ativo);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    setSalvando(true);
    setErro(null);

    const { error } = await supabase
      .from("profissional")
      .update({
        nome,
        horario_abertura: abertura,
        horario_fechamento: fechamento,
        ativo,
      })
      .eq("id", profissional.id);

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
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-semibold">{profissional.nome}</p>
            <p className="text-sm text-texto-secundario">
              {profissional.horario_abertura.slice(0, 5)} às{" "}
              {profissional.horario_fechamento.slice(0, 5)}
              {!profissional.ativo && " · inativo"}
            </p>
          </div>
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
      </li>
    );
  }

  return (
    <li className="rounded-xl bg-cartao px-5 py-4">
      <form onSubmit={salvar} className="flex flex-col gap-3">
        <CampoTexto label="Nome" value={nome} onChange={setNome} />
        <div className="flex gap-3">
          <CampoHora label="Abre" value={abertura} onChange={setAbertura} />
          <CampoHora label="Fecha" value={fechamento} onChange={setFechamento} />
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

function FormNovoProfissional({
  aoCriar,
  aoCancelar,
}: {
  aoCriar: () => void;
  aoCancelar: () => void;
}) {
  const [nome, setNome] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    setSalvando(true);
    setErro(null);

    const { error } = await supabase.from("profissional").insert({
      tenant_id: TENANT_ID,
      nome,
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
      <CampoTexto
        label="Nome da nova cadeira"
        value={nome}
        onChange={setNome}
        obrigatorio
      />
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
    <label className="flex flex-col gap-1 text-sm text-texto-secundario">
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

function CampoHora({
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
        type="time"
        value={value.slice(0, 5)}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-dourado-escuro bg-fundo px-4 py-3 text-base text-texto-principal outline-none focus-visible:ring-2 focus-visible:ring-dourado"
      />
    </label>
  );
}
