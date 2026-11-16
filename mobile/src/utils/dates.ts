// Datas como a API manda (texto ISO) viram texto em portugues, em um so lugar.
const LOCALE = 'pt-BR';

// "12 de novembro de 2026": a leitura do post.
export function formatDate(iso?: string): string {
  if (!iso) {
    return '';
  }
  return new Date(iso).toLocaleDateString(LOCALE, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// "12/11/2026": as listas.
export function formatShortDate(iso?: string): string {
  if (!iso) {
    return '';
  }
  return new Date(iso).toLocaleDateString(LOCALE, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// "12/11/2026 às 14:05": os comentarios.
export function formatDateTime(iso?: string): string {
  if (!iso) {
    return '';
  }
  const time = new Date(iso).toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' });
  return `${formatShortDate(iso)} às ${time}`;
}
