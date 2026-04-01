import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type MarkdownProps = {
  children: string;
};

/**
 * Markdown com GFM (tabelas, listas de tarefas, strikethrough).
 * Necessário para cronogramas e documentos gerados com tabelas.
 */
export function Markdown({ children }: MarkdownProps) {
  return <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>;
}
