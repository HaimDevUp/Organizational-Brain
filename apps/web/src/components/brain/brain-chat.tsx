"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Send, Brain, FileText, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import { isRtlText, textDirection } from "@/lib/text-direction";

type Citation = {
  documentId: string;
  title: string;
  gitPath: string;
  score?: number;
  excerpt?: string;
};

type Message = {
  role: "user" | "assistant";
  content: string;
  confidence?: number;
  citations?: Citation[];
};

export function BrainChat({ orgId, orgSlug }: { orgId: string; orgSlug: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [expandedSources, setExpandedSources] = useState<Set<number>>(() => new Set());
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRtl = isRtlText(input);

  function toggleSources(index: number) {
    setExpandedSources((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch(`/api/v1/organizations/${orgId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, conversationId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? "Chat failed");

      setConversationId(data.conversationId);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: data.answer,
          confidence: data.confidence,
          citations: data.citations,
        },
      ]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: err instanceof Error ? err.message : "Something went wrong",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
            <Brain className="mb-4 h-12 w-12 text-primary opacity-60" />
            <h2 className="text-lg font-medium text-foreground">Organizational Brain</h2>
            <p className="mt-1 max-w-md text-sm">
              Ask anything about your organization&apos;s approved knowledge. Answers include
              citations and confidence scores.
            </p>
          </div>
        )}
        {messages.map((msg, i) => {
          const rtl = isRtlText(msg.content);
          const dir = textDirection(msg.content);
          const sourcesOpen = expandedSources.has(i);
          const citationCount = msg.citations?.length ?? 0;
          return (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <Card
              className={`max-w-[85%] ${
                msg.role === "user" ? "bg-primary text-primary-foreground" : ""
              }`}
            >
              <CardContent className="py-3 px-4">
                <p
                  dir={dir}
                  className={`whitespace-pre-wrap text-sm ${rtl ? "text-right" : "text-left"}`}
                >
                  {msg.content}
                </p>
                {msg.role === "assistant" && msg.confidence !== undefined && (
                  <div className={`mt-2 flex items-center gap-2 ${rtl ? "justify-end" : ""}`}>
                    <Badge
                      variant={
                        msg.confidence >= 0.65
                          ? "default"
                          : msg.confidence >= 0.4
                            ? "secondary"
                            : "destructive"
                      }
                    >
                      {Math.round(msg.confidence * 100)}% confidence
                    </Badge>
                  </div>
                )}
                {msg.role === "assistant" && citationCount > 0 && (
                  <div dir={dir} className={`mt-3 ${rtl ? "text-right" : ""}`}>
                    <div className={`flex ${rtl ? "justify-end" : "justify-start"}`}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className={`h-8 gap-1.5 px-2 text-xs opacity-90 hover:opacity-100 ${rtl ? "flex-row-reverse" : ""}`}
                      onClick={() => toggleSources(i)}
                    >
                      {sourcesOpen ? (
                        <ChevronUp className="h-3.5 w-3.5 shrink-0" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                      )}
                      {sourcesOpen
                        ? rtl
                          ? "הסתר מקורות"
                          : "Hide sources"
                        : rtl
                          ? `הצג מקורות (${citationCount})`
                          : `Show sources (${citationCount})`}
                    </Button>
                    </div>
                    {sourcesOpen && (
                      <div className="mt-2 space-y-2 border-t pt-3">
                        <p className="text-xs font-medium opacity-80">
                          {rtl ? "מקורות" : "Sources"}
                        </p>
                        {msg.citations!.map((c, j) => (
                          <Link
                            key={j}
                            href={`/${orgSlug}/knowledge/${c.documentId}`}
                            className={`flex items-start gap-2 rounded-md bg-muted/50 p-2 text-xs hover:bg-muted ${rtl ? "flex-row-reverse text-right" : ""}`}
                          >
                            <FileText className="mt-0.5 h-3 w-3 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="font-medium">{c.title}</p>
                              {c.excerpt && (
                                <p className="mt-0.5 line-clamp-2 opacity-70">{c.excerpt}</p>
                              )}
                              {c.score !== undefined && (
                                <p className="mt-0.5 opacity-60">
                                  {rtl
                                    ? `רלוונטיות: ${Math.round(c.score * 100)}%`
                                    : `Relevance: ${Math.round(c.score * 100)}%`}
                                </p>
                              )}
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );
        })}
        {loading && (
          <p className="text-sm text-muted-foreground animate-pulse">Thinking…</p>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="border-t bg-background pt-4">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            dir={inputRtl ? "rtl" : "ltr"}
            placeholder={inputRtl ? "שאל את Organizational Brain…" : "Ask Organizational Brain…"}
            className={inputRtl ? "text-right" : ""}
            rows={2}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <Button onClick={send} disabled={loading} size="icon" className="h-auto shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
