import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { Avatar } from '../components/Figure';
import { SubHeader } from '../components/Shell';
import { Icon } from '../components/Icon';

/** Chat with characters, in-character. Reached from the top-bar chat icon. */
export function Chat({ characterId }: { characterId?: string }) {
  const s = useStore();
  const [active, setActive] = useState<string | undefined>(characterId);
  const [text, setText] = useState('');
  const end = useRef<HTMLDivElement>(null);
  const thread = s.chats.find((t) => t.characterId === active);
  const c = active ? s.character(active) : undefined;
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread?.messages.length]);

  if (!c) {
    const others = s.characters.filter((x) => !s.chats.some((t) => t.characterId === x.id));
    return (
      <div className="page">
        <SubHeader title="Chat" />
        {s.chats.map((t) => {
          const ch = s.character(t.characterId);
          if (!ch) return null;
          const last = t.messages.at(-1);
          return (
            <button key={t.id} className="list-row" onClick={() => setActive(ch.id)}>
              <Avatar c={ch} size={44} />
              <div className="grow left"><b>{ch.name}</b><div className="muted sm clamp">{last?.text}</div></div>
            </button>
          );
        })}
        <h3 className="section-title">Start a chat</h3>
        <div className="char-row">
          {others.map((ch) => (
            <button key={ch.id} className="char-tile" onClick={() => setActive(ch.id)}>
              <Avatar c={ch} size={56} /><b>{ch.name}</b>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const send = () => {
    if (!text.trim()) return;
    s.sendChat(c.id, text.trim());
    setText('');
  };

  return (
    <div className="page chat-page">
      <div className="subheader">
        <button className="icon-btn" onClick={() => (characterId ? s.back() : setActive(undefined))} aria-label="Back"><Icon name="back" /></button>
        <button className="row gap center" onClick={() => s.go({ name: 'character', id: c.id })}><Avatar c={c} size={32} /><h1>{c.name}</h1></button>
      </div>
      <div className="messages">
        {(thread?.messages ?? []).map((m, i) => (
          <div key={i} className={`msg ${m.from}`}>{m.text}</div>
        ))}
        {!thread && <p className="muted center-text">Say hi to {c.name}.</p>}
        <div ref={end} />
      </div>
      <div className="composer">
        <input className="input" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder={`Message ${c.name}`} />
        <button className="btn primary" onClick={send} aria-label="Send"><Icon name="send" size={18} /></button>
      </div>
    </div>
  );
}
