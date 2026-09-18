"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import styles from "./chat.module.css";

type Msg = {
  role: "user" | "assistant";
  content: string;
  tools?: Array<{
    name: string;
    summary: string;
    meaning?: string;
    when?: string;
    spec?: string;
    href?: string;
  }>;
};

const STARTERS = [
  "Mau ke Jepang",
  "Dari Jakarta ke Bali tanggal 12–15 Oktober, 2 orang",
  "Yang nomor 2, sekalian hotel",
  "Kunci opsi 2 dan ingatkan aku sebelum berangkat",
];

type Phase = "thinking" | "typing" | null;

type SpecLink = { name: string; spec: string; href: string };

type DoneMeta = {
  model?: string;
  packVersion?: string;
  usedTemplateFallback?: boolean;
  trainingResults?: string;
  trainingResultsHref?: string;
  catalog?: SpecLink[];
  tools?: Msg["tools"];
};

type Footer = {
  model?: string;
  packVersion?: string;
  trainingResults?: string;
  trainingResultsHref?: string;
  usedTemplateFallback?: boolean;
  catalog?: SpecLink[];
};

export function ChatApp() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Hai, aku **TripSpec**. Sebut negara atau kota. Aku susun itinerary liburan dari panduan, kasih opsi terbang tanpa harga, lalu pengingat in-app.",
    },
  ]);
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<Phase>(null);
  const [meta, setMeta] = useState<Footer | null>(null);
  const [openTool, setOpenTool] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const busy = phase !== null;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, phase]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    const next: Msg[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setPhase("thinking");
    setMeta(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({
          messages: next
            .filter((m) => m.role === "user" || m.role === "assistant")
            .map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `Error ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let started = false;
      const queue: string[] = [];
      let kicking = false;
      let streamDone = false;
      let settle: (() => void) | null = null;

      const append = (chunk: string) => {
        const first = !started;
        started = true;
        setMessages((current) => {
          const copy = [...current];
          const last = copy[copy.length - 1];
          if (first || last?.role !== "assistant") {
            copy.push({ role: "assistant", content: chunk });
          } else {
            copy[copy.length - 1] = { ...last, content: last.content + chunk };
          }
          return copy;
        });
      };

      const kick = () => {
        if (kicking) return;
        kicking = true;
        const step = () => {
          const ch = queue.shift();
          if (!ch) {
            kicking = false;
            if (streamDone) settle?.();
            return;
          }
          if (!started) setPhase("typing");
          append(ch);
          window.setTimeout(step, queue.length > 240 ? 8 : 18);
        };
        step();
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";
        for (const frame of frames) {
          const event = frame.match(/^event: (.+)$/m)?.[1] ?? "message";
          const dataLine = frame
            .split("\n")
            .filter((line) => line.startsWith("data: "))
            .map((line) => line.slice(6))
            .join("\n");
          if (!dataLine) continue;
          const data = JSON.parse(dataLine) as { text?: string; error?: string } & DoneMeta;
          if (event === "error") {
            throw new Error(data.error ?? "Stream error");
          }
          if (event === "delta" && data.text) {
            queue.push(...data.text);
            kick();
          }
          if (event === "done") {
            const tools = data.tools;
            const footer: Footer = {
              model: data.model,
              packVersion: data.packVersion,
              trainingResults: data.trainingResults,
              trainingResultsHref: data.trainingResultsHref,
              usedTemplateFallback: data.usedTemplateFallback,
              catalog: data.catalog,
            };
            const applyDone = () => {
              setMessages((current) => {
                const copy = [...current];
                const last = copy[copy.length - 1];
                if (last?.role === "assistant") {
                  copy[copy.length - 1] = { ...last, tools };
                }
                return copy;
              });
              setMeta(footer);
            };
            if (!kicking && queue.length === 0) applyDone();
            else {
              const previous = settle;
              settle = () => {
                previous?.();
                applyDone();
              };
            }
          }
        }
      }

      await new Promise<void>((resolve) => {
        const previous = settle;
        settle = () => {
          previous?.();
          resolve();
        };
        streamDone = true;
        if (!kicking) settle();
      });
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: err instanceof Error ? err.message : String(err),
        },
      ]);
    } finally {
      setPhase(null);
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
          Itinerary liburan dari panduan — bukan daftar harga.
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
                {phase === "typing" && i === messages.length - 1 ? (
                  <span className={styles.caret} />
                ) : null}
                {m.tools?.length ? (
                  <div className={styles.tools}>
                    {m.tools.map((t) => {
                      const key = `${i}-${t.name}`;
                      const open = openTool === key;
                      return (
                        <div key={t.name} className={styles.toolWrap}>
                          <a
                            className={styles.tool}
                            href={t.href ?? "#"}
                            aria-expanded={open}
                            onClick={(event) => {
                              event.preventDefault();
                              setOpenTool(open ? null : key);
                              if (t.href) window.open(t.href);
                            }}
                          >
                            {t.name}
                          </a>
                          {open ? (
                            <div className={styles.toolNote}>
                              <p>{t.meaning ?? t.summary}</p>
                              {t.when ? <p className={styles.toolWhen}>{t.when}</p> : null}
                              {t.href && t.spec ? (
                                <a className={styles.toolLink} href={t.href}>
                                  {t.spec}
                                </a>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
          {phase === "thinking" && (
            <div className={styles.bot}>
              <span className={styles.role}>TripSpec</span>
              <div className={`${styles.bubble} ${styles.thinking}`}>Berpikir…</div>
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
        {meta && (
          <p className={styles.meta}>
            {[
              meta.model && `model ${meta.model}`,
              meta.packVersion && `pack ${meta.packVersion}`,
            ]
              .filter(Boolean)
              .join(" · ")}
            {meta.trainingResultsHref ? (
              <>
                {" · "}
                <a href={meta.trainingResultsHref}>results {meta.trainingResults}</a>
              </>
            ) : null}
            {meta.usedTemplateFallback ? " · template fallback" : null}
            {meta.catalog?.length ? (
              <span className={styles.metaSpecs}>
                {meta.catalog.map((tool) => (
                  <a key={tool.name} href={tool.href} title={tool.name}>
                    {tool.spec}
                  </a>
                ))}
              </span>
            ) : null}
          </p>
        )}
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
