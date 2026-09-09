// Monta o link "wa.me" que abre o WhatsApp (instalado no celular, ou
// WhatsApp Web no computador) já com o número certo e o texto preenchido.
// A pessoa só confere e aperta enviar — não é envio automático.

export function preencherModelo(
  texto: string,
  valores: { cliente?: string; horario?: string; profissional?: string },
): string {
  return texto
    .replaceAll("{{cliente}}", valores.cliente ?? "")
    .replaceAll("{{horario}}", valores.horario ?? "")
    .replaceAll("{{profissional}}", valores.profissional ?? "");
}

export function linkWhatsApp(telefone: string, mensagem: string): string {
  const somenteDigitos = telefone.replace(/\D/g, "");
  // Se a pessoa não digitou o "55" do Brasil na frente, adiciona.
  const numeroCompleto = somenteDigitos.startsWith("55")
    ? somenteDigitos
    : `55${somenteDigitos}`;
  return `https://wa.me/${numeroCompleto}?text=${encodeURIComponent(mensagem)}`;
}
