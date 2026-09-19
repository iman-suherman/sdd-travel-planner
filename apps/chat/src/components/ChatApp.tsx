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

function closingAsk(text: string): string {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
  const last = paragraphs.at(-1) ?? "";
  if (last.includes("?")) return last;
  return (
    text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.includes("?"))
      .at(-1) ?? ""
  );
}

/** Clickable replies to the question the assistant just asked. Same trip, not another script. */
function nextSuggestions(messages: Msg[]): string[] {
  const users = messages.filter((m) => m.role === "user");
  if (users.length === 0) return ["Mau ke Jepang", "Mau ke Bali", "Mau ke Singapore"];

  const lastBot = [...messages].reverse().find((m) => m.role === "assistant")?.content ?? "";
  const ask = closingAsk(lastBot);
  if (!ask) return [];

  const aboutStay = /hotel|menginap|inn|lodge/i.test(lastBot);
  if (/pilih\s*1/i.test(ask)) {
    return aboutStay
      ? [
          "Kunci opsi 1 dan ingatkan aku sebelum berangkat",
          "Kunci opsi 2 dan ingatkan aku sebelum berangkat",
          "Kunci opsi 3 dan ingatkan aku sebelum berangkat",
        ]
      : ["Yang nomor 1", "Yang nomor 2, sekalian hotel", "Yang nomor 3"];
  }

  const wantsOrigin = /berangkat dari mana|dari mana/i.test(ask);
  const wantsDate = /kapan|tanggal/i.test(ask);
  const wantsPeople = /berapa orang|berapa traveler/i.test(ask);
  if (wantsOrigin || wantsDate || wantsPeople) {
    const samples = [
      { origin: "Dari Jakarta", date: "besok", people: "saya dan istri" },
      { origin: "Dari Surabaya", date: "lusa", people: "2 orang" },
      { origin: "Dari Jakarta", date: "tanggal 12–15 Oktober", people: "saya sendiri" },
    ];
    const lines = samples.map((sample) =>
      [
        wantsOrigin ? sample.origin : "",
        wantsDate ? sample.date : "",
        wantsPeople ? sample.people : "",
      ]
        .filter(Boolean)
        .join(", "),
    );
    return [...new Set(lines)];
  }

  if (/kota lain|kota yang berbeda|mau kota/i.test(ask)) {
    const thread = messages.map((m) => m.content).join("\n");
    if (/jepang|tokyo/i.test(thread)) return ["Tokyo saja"];
    if (/bali/i.test(thread)) return ["Bali saja"];
    if (/singap/i.test(thread)) return ["Singapore saja"];
  }

  if (/list.*opsi|opsi yang ada/i.test(ask)) return ["Iya, list 3 opsi yang ada"];

  return [];
}

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
  const [activity, setActivity] = useState<string[]>([]);
  const [meta, setMeta] = useState<Footer | null>(null);
  const [openTool, setOpenTool] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const busy = phase !== null;

  const suggestions = nextSuggestions(messages);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, phase, activity]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    const next: Msg[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setPhase("thinking");
    setActivity([]);
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
          if (event === "log" && data.text) {
            const line = data.text;
            setActivity((lines) => {
              if (line.startsWith("Ollama now") && lines.at(-1)?.startsWith("Ollama now")) {
                return [...lines.slice(0, -1), line];
              }
              return [...lines, line].slice(-8);
            });
          }
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
              <div className={`${styles.bubble} ${styles.thinking}`}>
                <span className={styles.thinkingLabel}>Sedang bekerja</span>
                <ul className={styles.activity}>
                  {(activity.length ? activity : ["Menunggu langkah pertama…"]).map((line, i, all) => (
                    <li key={`${i}-${line.slice(0, 24)}`} className={i === all.length - 1 ? styles.activityCurrent : undefined}>
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {suggestions.length > 0 && (
          <div className={styles.starters}>
            <p className={styles.suggestLabel}>Jawaban untuk pertanyaan ini</p>
            {suggestions.map((text) => (
              <button
                key={text}
                type="button"
                className={styles.chip}
                disabled={busy}
                onClick={() => void send(text)}
              >
                {text}
              </button>
            ))}
          </div>
        )}

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
