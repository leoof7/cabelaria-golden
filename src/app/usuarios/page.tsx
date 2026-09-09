"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useExigirLogin } from "@/lib/usar-exigir-login";
import type { Papel } from "@/lib/perfil";

type LinhaUsuario = {
  id: string;
  papel: Papel;
  profissional_id: string | null;
  criado_em: string;
};

type Profissional = { id: string; nome: string };

export default function PaginaUsuarios() {
  const { pronto, ehDono } = useExigirLogin();
  const [usuarios, setUsuarios] = useState<LinhaUsuario[] | null>(null);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  async function carregar() {
    const [resUsuarios, resProfissionais] = await Promise.all([
      supabase
        .from("perfil")
        .select("id, papel, profissional_id, criado_em")
        .order("criado_em"),
      supabase.from("profissional").select("id, nome").order("nome"),
    ]);

    if (resUsuarios.error) {
      setErro(resUsuarios.error.message);
      return;
    }
    setUsuarios(resUsuarios.data);
    setProfissionais(resProfissionais.data ?? []);
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
          Só o dono pode gerenciar os acessos da equipe.
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
        <h1 className="titulo-marca text-2xl text-dourado">
          Acessos da equipe
        </h1>
      </div>
      <div className="divisoria-metalica" />

      {erro && <p className="text-alerta">{erro}</p>}

      {usuarios?.length === 0 && (
        <p className="text-texto-secundario">
          Nenhum login criado ainda. Peça pra pessoa criar a conta dela na
          tela de login — ela aparece aqui como pendente.
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {usuarios?.map((u) => (
          <LinhaUsuarioEditavel
            key={u.id}
            usuario={u}
            profissionais={profissionais}
            aoSalvar={carregar}
          />
        ))}
      </ul>
    </div>
  );
}

function LinhaUsuarioEditavel({
  usuario,
  profissionais,
  aoSalvar,
}: {
  usuario: LinhaUsuario;
  profissionais: Profissional[];
  aoSalvar: () => void;
}) {
  const [papel, setPapel] = useState<Papel>(usuario.papel);
  const [profissionalId, setProfissionalId] = useState(
    usuario.profissional_id ?? "",
  );
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const pendente = usuario.papel === "profissional" && !usuario.profissional_id;

  async function salvar() {
    setSalvando(true);
    setErro(null);

    const { error } = await supabase
      .from("perfil")
      .update({
        papel,
        profissional_id: papel === "profissional" ? profissionalId || null : null,
      })
      .eq("id", usuario.id);

    setSalvando(false);
    if (error) {
      setErro(error.message);
      return;
    }
    aoSalvar();
  }

  return (
    <li className="flex flex-col gap-3 rounded-xl bg-cartao px-5 py-4">
      <p className="text-xs text-texto-secundario">
        Login: {usuario.id.slice(0, 8)}...
        {pendente && (
          <span className="ml-2 rounded-full bg-alerta/20 px-2 py-0.5 text-alerta">
            pendente
          </span>
        )}
      </p>

      <label className="flex flex-col gap-1 text-sm text-texto-secundario">
        Papel
        <select
          value={papel}
          onChange={(e) => setPapel(e.target.value as Papel)}
          className="rounded-lg border border-dourado-escuro bg-fundo px-4 py-3 text-base text-texto-principal outline-none focus-visible:ring-2 focus-visible:ring-dourado"
        >
          <option value="profissional">Profissional</option>
          <option value="recepcao">Recepção</option>
          <option value="dono">Dono</option>
        </select>
      </label>

      {papel === "profissional" && (
        <label className="flex flex-col gap-1 text-sm text-texto-secundario">
          Cadeira
          <select
            value={profissionalId}
            onChange={(e) => setProfissionalId(e.target.value)}
            className="rounded-lg border border-dourado-escuro bg-fundo px-4 py-3 text-base text-texto-principal outline-none focus-visible:ring-2 focus-visible:ring-dourado"
          >
            <option value="">Selecione...</option>
            {profissionais.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </label>
      )}

      {erro && <p className="text-sm text-alerta">{erro}</p>}

      <button
        type="button"
        onClick={salvar}
        disabled={salvando}
        className="rounded-lg bg-dourado py-2 font-bold text-fundo disabled:opacity-60"
      >
        {salvando ? "Salvando..." : "Salvar"}
      </button>
    </li>
  );
}
