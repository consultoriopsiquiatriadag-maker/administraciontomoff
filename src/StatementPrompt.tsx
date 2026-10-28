import { useRef, useState } from "react";
import { Copy, ExternalLink } from "lucide-react";
import type { State } from "./model";
import { buildStatementPrompt } from "./statementPrompt";
export function StatementPrompt({ state }: { state: State }) {
  const [cardId, setCardId] = useState("all"),
    [notice, setNotice] = useState("");
  const text = useRef<HTMLTextAreaElement>(null),
    details = useRef<HTMLDetailsElement>(null);
  const prompt = buildStatementPrompt(
    state,
    state.cards.some((c) => c.id === cardId) ? cardId : "all",
  );
  return (
    <section className="panel statement-prompt">
      <h2>Preparar un resumen con mi ChatGPT</h2>
      <p>
        Copia este prompt cada vez que recibas un resumen nuevo. Úsalo en tu
        propio ChatGPT y después pega su respuesta en «Importar cuentas
        extraídas».
      </p>
      <ol>
        <li>Copia el prompt con el botón de abajo.</li>
        <li>
          Abre tu ChatGPT, pega el prompt y adjunta el PDF o una imagen legible
          del resumen.
        </li>
        <li>Copia el JSON de la respuesta y vuelve a esta página.</li>
        <li>
          Pégalo en «Pegar código de tus cuentas», pulsa «Revisar datos pegados»
          y verifica los importes antes de importar.
        </li>
      </ol>
      <label className="prompt-scope">
        Referencias para reconocer la cuenta
        <select
          aria-label="Cuenta para el prompt"
          value={cardId}
          onChange={(e) => {
            setCardId(e.target.value);
            setNotice("");
          }}
        >
          <option value="all">Todas mis tarjetas registradas</option>
          {state.cards.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <p className="muted">
        El prompt incluye nombres, terminaciones parciales y referencias de
        compras en cuotas de las tarjetas elegidas. No incluye saldos, pagos ni
        documentos. La página no envía nada a ChatGPT: tú decides qué copiar y
        adjuntar. Genera el prompt desde aquí para que use tus referencias
        actuales.
      </p>
      {state.demo && (
        <p className="alert warning">
          Estás en demostración: el prompt incluirá referencias ficticias.
          Elimina la demostración antes de usarlo con tus cuentas reales o
          revisa el registro incluido.
        </p>
      )}
      <div className="prompt-actions">
        <button
          className="button"
          onClick={async () => {
            try {
              if (!navigator.clipboard) throw Error("clipboard unavailable");
              await navigator.clipboard.writeText(prompt);
              setNotice(
                "Prompt copiado. Pégalo en tu ChatGPT y adjunta el resumen.",
              );
            } catch {
              if (details.current) details.current.open = true;
              text.current?.focus();
              text.current?.select();
              setNotice(
                "El prompt está seleccionado. Copia con ⌘C en Mac o Ctrl+C en Windows.",
              );
            }
          }}
        >
          <Copy size={18} />
          Copiar prompt para mi ChatGPT
        </button>
        <a
          className="button secondary"
          href="https://chatgpt.com/"
          target="_blank"
          rel="noopener noreferrer"
        >
          <ExternalLink size={17} />
          Abrir mi ChatGPT
        </a>
      </div>
      {notice && (
        <p className="save-notice" role="status">
          {notice}
        </p>
      )}
      <details ref={details}>
        <summary>Ver o copiar el prompt completo</summary>
        <label htmlFor="statement-extraction-prompt">
          Prompt de extracción de resúmenes
        </label>
        <textarea
          ref={text}
          id="statement-extraction-prompt"
          readOnly
          value={prompt}
          spellCheck={false}
        />
      </details>
    </section>
  );
}
