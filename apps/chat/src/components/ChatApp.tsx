"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import styles from "./chat.module.css";

type Msg = { role: "user" | "assistant"; content: string };

const STARTERS = [
  "Liburan ke Bali 3 hari budget 5jt",
  "Dari Jakarta ke Bali tanggal 12–15 Oktober, budget 5 juta, 2 orang",
  "Ada tiket Garuda jam 3 pagi harga 900rb?",
];

export function ChatApp() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Hai, aku **TripSpec**. Kasih origin, destinasi, tanggal, budget, dan jumlah traveler — nanti aku kasih 3 opsi dari data stub (bukan invent).",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [meta, setMeta] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    const next: Msg[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setBusy(true);
    setMeta(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next
            .filter((m) => m.role === "user" || m.role === "assistant")
            .map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = (await res.json()) as {
        reply?: string;
        error?: string;
        packVersion?: string;
        model?: string;
        usedTemplateFallback?: boolean;
      };
      if (!res.ok) {
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: data.error ?? `Error ${res.status}`,
          },
        ]);
      } else {
        setMessages((m) => [
          ...m,
          { role: "assistant", content: data.reply ?? "(kosong)" },
        ]);
        setMeta(
          [
            data.model && `model ${data.model}`,
            data.packVersion && `pack ${data.packVersion}`,
            data.usedTemplateFallback && "template fallback",
          ]
            .filter(Boolean)
            .join(" · "),
        );
      }
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: `Gagal konek: ${err instanceof Error ? err.message : String(err)}`,
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }

  return (
    <div className={styles.shell}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>SDD teaching demo · Ollama</p>
        <h1 className={styles.brand}>TripSpec</h1>
        <p className={styles.tagline}>
          Rencana trip lewat SPEC + eval — bukan fine-tuning.
        </p>
      </header>

      <main className={styles.panel}>
        <div className={styles.thread} aria-live="polite">
          {messages.map((m, i) => (
            <div
              key={`${i}-${m.role}`}
              className={m.role === "user" ? styles.user : styles.bot}
            >
              <span className={styles.role}>
                {m.role === "user" ? "Kamu" : "TripSpec"}
              </span>
              <div className={styles.bubble}>
                {m.content.split("\n").map((line, j) => (
                  <p key={j}>{renderInline(line)}</p>
                ))}
              </div>
            </div>
          ))}
          {busy && (
            <div className={styles.bot}>
              <span className={styles.role}>TripSpec</span>
              <div className={`${styles.bubble} ${styles.typing}`}>
                ngetik…
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className={styles.starters}>
          {STARTERS.map((s) => (
            <button
              key={s}
              type="button"
              className={styles.chip}
              disabled={busy}
              onClick={() => void send(s)}
            >
              {s}
            </button>
          ))}
        </div>

        <form className={styles.composer} onSubmit={onSubmit}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tulis pesan… (Bahasa OK)"
            disabled={busy}
            aria-label="Pesan"
          />
          <button type="submit" disabled={busy || !input.trim()}>
            Kirim
          </button>
        </form>
        {meta && <p className={styles.meta}>{meta}</p>}
      </main>
    </div>
  );
}

function renderInline(line: string) {
  const parts = line.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}
