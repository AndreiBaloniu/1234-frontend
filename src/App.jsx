import React, { useEffect, useMemo, useRef, useState } from "react";
import io from "socket.io-client";
import RetroButton from "./components/RetroButton.jsx";
import TileRow from "./components/TileRow.jsx";
import TileInput from "./components/TileInput.jsx";
import { isFourDigits } from "./lib/validate.js";

const MODES = {
  CLASSIC: { key: "CLASSIC", label: "Classic (X/4 only)" },
  REVEAL_DIGITS: { key: "REVEAL_DIGITS", label: "Reveal digits" },
  REVEAL_POSITIONS: { key: "REVEAL_POSITIONS", label: "Reveal positions" },
};

function getSavedName() {
  try {
    return localStorage.getItem("1234:name") || "";
  } catch {
    return "";
  }
}
function saveName(n) {
  try {
    localStorage.setItem("1234:name", n);
  } catch {}
}

const SERVER = import.meta.env.VITE_SERVER || "http://localhost:4000";

export default function App() {
  const [socket, setSocket] = useState(null);
  const [step, setStep] = useState("menu"); // menu -> modes -> home -> lobby -> secret -> play -> win
  const [me, setMe] = useState({ id: null, name: "" });
  const [room, setRoom] = useState(null);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [name, setName] = useState(getSavedName());
  const [mode, setMode] = useState(MODES.CLASSIC.key);
  const [secret, setSecret] = useState("");
  const [history, setHistory] = useState([]);
  const [copied, setCopied] = useState(false);
  const tileRef = useRef(null);

  const myId = me.id;

  // ----- socket wiring -----
  useEffect(() => {
    const s = io(SERVER, { transports: ["websocket"] });
    setSocket(s);

    s.on("connect", () => setMe((m) => ({ ...m, id: s.id })));

    s.on("room-update", (r) => {
      setRoom(r);
      const ready = r.players.length === 2 && r.players.every((p) => p.ready);
      if (!r.winner && ready) go("play");
      if (r.winner) go("win");
    });

    s.on("history-update", setHistory);

    s.on("room-reset", (r) => {
      setHistory([]);
      setRoom(r);
      setSecret("");
      go("lobby");
    });

    s.on("game-over", ({ winner }) => {
      setRoom((r) => (r ? { ...r, winner } : r));
      go("win");
    });

    s.on("room-destroyed", ({ reason }) => {
      setInfo(
        reason === "player-left"
          ? "The other player left. Room closed."
          : "Room closed."
      );
      setHistory([]);
      setSecret("");
      setRoom(null);
      go("home");
    });

    s.on("error-msg", setError);

    return () => s.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----- derived -----
  const iAmTurn = useMemo(() => room?.currentTurn === myId, [room, myId]);
  const iWon = useMemo(() => room?.winner === myId, [room, myId]);
  const myGuesses = history.filter((h) => h.by === myId);
  const oppGuesses = history.filter((h) => h.by !== myId);

  // ----- navigation helpers -----
  const go = (next) => {
    setStep(next);
    try {
      window.history.pushState({ step: next }, "", "");
    } catch {}
  };

  const confirmLeaveIfNeeded = () => {
    if (step === "lobby" || step === "secret" || step === "play") {
      return window.confirm("Leave this room?");
    }
    return true;
  };

  useEffect(() => {
    try {
      window.history.replaceState({ step }, "", "");
    } catch {}
    const onPop = () => {
      if (!confirmLeaveIfNeeded()) {
        try {
          window.history.pushState({ step }, "", "");
        } catch {}
        return;
      }
      if (step === "home") setStep("modes");
      else if (step === "modes") setStep("menu");
      else if (step === "lobby" || step === "secret" || step === "play")
        leaveRoom();
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, room]);

  // deep link ?join=CODE
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("join");
    if (code && (step === "menu" || step === "modes")) {
      go("home");
      setJoinCode(code.toUpperCase());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const createRoom = () => {
    setError("");
    setInfo("");
    socket.emit("create-room", { name: name || "Player", mode }, (res) => {
      if (res?.code) {
        go("lobby");
        setRoom({ code: res.code, players: [], mode });
      } else if (res?.error) setError(res.error);
    });
  };

  const joinRoom = () => {
    setError("");
    setInfo("");
    if (!joinCode) return;
    socket.emit(
      "join-room",
      { code: joinCode, name: name || "Player" },
      (res) => {
        if (res?.error) setError(res.error);
        else go("lobby");
      }
    );
  };

  const submitSecret = () => {
    setError("");
    if (!isFourDigits(secret)) {
      setError("Secret must be exactly 4 digits.");
      return;
    }
    socket.emit("set-secret", { code: room.code, secret });
    go("secret");
  };

  const submitGuess = (g) => {
    setError("");
    if (!isFourDigits(g)) {
      setError("Guess must be exactly 4 digits.");
      return;
    }
    socket.emit("guess", { code: room.code, guess: g });

    tileRef.current?.clear?.();
  };

  const leaveRoom = () => {
    if (room?.code) socket.emit("leave-room", { code: room.code });
    setHistory([]);
    setSecret("");
    setRoom(null);
    go("home");
  };

  const copyRoomCode = () => {
    if (!room?.code) return;
    navigator.clipboard.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 800);
  };

  // ----- UI -----
  return (
    <div className="center">
      <div className="shell">
        <div className="header">
          <div className="logo">1234</div>
        </div>

        {!!info && (
          <div className="card banner" style={{ color: "#93c5fd" }}>
            {info}
          </div>
        )}
        {!!error && (
          <div className="card banner" style={{ color: "#fb7185" }}>
            {error}
          </div>
        )}

        {room && (
          <div className="room">
            <button
              className={`btn ${copied ? "flash" : ""}`}
              onClick={copyRoomCode}
              title="Copy room code"
            >
              Room: {room.code}
            </button>
            {" • "}
            {room.mode}
          </div>
        )}

        {/* MENU */}
        {step === "menu" && (
          <div className="card grid" style={{ justifyItems: "center" }}>
            <div className="grid" style={{ width: "min(420px,100%)" }}>
              <label className="small">Player name</label>
              <input
                className="input"
                placeholder="Your name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  saveName(e.target.value);
                }}
              />
            </div>
            <div className="actions">
              <RetroButton onClick={() => go("modes")}>Play</RetroButton>
            </div>
          </div>
        )}

        {/* MODES */}
        {step === "modes" && (
          <div className="card grid" style={{ justifyItems: "center" }}>
            <div className="actions">
              {Object.values(MODES).map((m) => (
                <RetroButton
                  key={m.key}
                  onClick={() => {
                    setMode(m.key);
                    go("home");
                  }}
                >
                  {m.label}
                </RetroButton>
              ))}
            </div>
            <div className="actions">
              <RetroButton variant="back" onClick={() => go("menu")}>
                Back
              </RetroButton>
            </div>
            <div className="small">
              Choose a mode, then create or join a room.
            </div>
          </div>
        )}

        {/* HOME */}
        {step === "home" && (
          <div className="card grid" style={{ justifyItems: "center" }}>
            <div className="actions">
              <RetroButton onClick={createRoom}>Create Room</RetroButton>
            </div>
            <div
              className="grid"
              style={{
                gridTemplateColumns: "1fr",
                gap: 12,
                width: "min(420px,100%)",
              }}
            >
              <input
                className="input"
                placeholder="Enter Code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              />
              <RetroButton onClick={joinRoom}>Join</RetroButton>
            </div>
            <div className="actions">
              <RetroButton variant="back" onClick={() => go("modes")}>
                Back
              </RetroButton>
            </div>
            <p className="small">
              Share your room code or paste one to join from another device.
            </p>
          </div>
        )}

        {/* LOBBY */}
        {step === "lobby" && room && (
          <div className="card grid" style={{ justifyItems: "center" }}>
            <div className="banner">
              {room.players.length < 2
                ? "Waiting for an opponent…"
                : "Both players here!"}
            </div>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                lineHeight: "2",
                textAlign: "center",
              }}
            >
              {room.players.map((p) => (
                <li key={p.id}>
                  {p.id === myId ? "🟢" : "🔹"} {p.name}
                </li>
              ))}
            </ul>
            <div
              className="grid"
              style={{
                gridTemplateColumns: "1fr auto",
                gap: 8,
                width: "min(420px,100%)",
              }}
            >
              <input
                className="input"
                placeholder="Set your 4-digit secret"
                value={secret}
                maxLength={4}
                onChange={(e) => setSecret(e.target.value.replace(/\D/g, ""))}
              />
              <RetroButton
                onClick={submitSecret}
                disabled={
                  !isFourDigits(secret) || (room?.players?.length ?? 0) < 2
                }
              >
                Lock
              </RetroButton>
            </div>
            <div className="actions">
              <RetroButton
                variant="leave"
                onClick={() => {
                  if (window.confirm("Leave this room?")) leaveRoom();
                }}
              >
                Leave Room
              </RetroButton>
            </div>
          </div>
        )}

        {/* SECRET */}
        {step === "secret" && (
          <div className="card grid" style={{ justifyItems: "center" }}>
            <div className="banner">
              Waiting for both players to lock their secrets…
            </div>
            <div className="actions">
              <RetroButton
                variant="leave"
                onClick={() => {
                  if (window.confirm("Leave this room?")) leaveRoom();
                }}
              >
                Leave Room
              </RetroButton>
            </div>
          </div>
        )}

        {/* PLAY */}
        {step === "play" && room && (
          <div className="card grid" style={{ justifyItems: "stretch" }}>
            <div className={`banner ${iAmTurn ? "turn-banner" : ""}`}>
              <span className="turn-chip">
                {iAmTurn ? "YOUR TURN" : "OPPONENT TURN"}
              </span>
              &nbsp;— {iAmTurn ? "type your guess in the tiles" : "hang tight"}
            </div>

            <div className="actions" style={{ justifyContent: "center" }}>
              <RetroButton
                variant="leave"
                onClick={() => {
                  if (
                    window.confirm(
                      "Leave the room? The game will reset for the other player."
                    )
                  )
                    leaveRoom();
                }}
              >
                Leave
              </RetroButton>
            </div>

            <div className="split">
              <div className={`panel left ${iAmTurn ? "active" : ""}`}>
                <div className="panel-title">You</div>
                <div className="feed">
                  {myGuesses.slice(-10).map((h, idx) => (
                    <TileRow
                      key={idx}
                      value={h.guess}
                      label={
                        room?.mode === "REVEAL_POSITIONS"
                          ? `${h.correctCount}/4  ${h.feedbackMask || ""}`
                          : room?.mode === "REVEAL_DIGITS"
                          ? `${h.correctCount}/4  [${(
                              h.feedbackDigits || []
                            ).join(", ")}]`
                          : `${h.correctCount}/4`
                      }
                    />
                  ))}
                </div>
              </div>
              <div className={`panel right ${!iAmTurn ? "active" : ""}`}>
                <div className="panel-title">Opponent</div>
                <div className="feed">
                  {oppGuesses.slice(-10).map((h, idx) => (
                    <TileRow
                      key={idx}
                      value={h.guess}
                      label={
                        room?.mode === "REVEAL_POSITIONS"
                          ? `${h.correctCount}/4  ${h.feedbackMask || ""}`
                          : room?.mode === "REVEAL_DIGITS"
                          ? `${h.correctCount}/4  [${(
                              h.feedbackDigits || []
                            ).join(", ")}]`
                          : `${h.correctCount}/4`
                      }
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="grid" style={{ justifyItems: "center" }}>
              <TileInput
                ref={tileRef}
                onSubmit={submitGuess}
                disabled={!iAmTurn}
              />
              {/* Mobile-friendly submit button (and desktop too, for clarity) */}
              <div className="actions mobile-submit">
                <RetroButton
                  onClick={() => {
                    const val = tileRef.current?.getValue?.() || "";
                    if (val.length === 4) submitGuess(val);
                  }}
                  disabled={!iAmTurn}
                >
                  Submit Guess
                </RetroButton>
              </div>
              <div className="small">
                {iAmTurn
                  ? "Press Enter or tap Submit."
                  : "Waiting for opponent…"}
              </div>
            </div>
          </div>
        )}

        {/* WIN */}
        {step === "win" && room && (
          <div className="card grid" style={{ justifyItems: "center" }}>
            <div
              className="banner"
              style={{ color: iWon ? "var(--lime)" : "#fb7185" }}
            >
              {iWon ? "You win!" : "You lost! Next time will be yours!"}
            </div>
            <div className="split">
              <div className="panel left">
                <div className="panel-title">You</div>
                <div className="feed">
                  {myGuesses.map((h, idx) => (
                    <TileRow
                      key={idx}
                      value={h.guess}
                      label={`${h.correctCount}/4`}
                    />
                  ))}
                </div>
              </div>
              <div className="panel right">
                <div className="panel-title">Opponent</div>
                <div className="feed">
                  {oppGuesses.map((h, idx) => (
                    <TileRow
                      key={idx}
                      value={h.guess}
                      label={`${h.correctCount}/4`}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="actions">
              <RetroButton
                onClick={() => socket.emit("reset-room", { code: room.code })}
              >
                Play again
              </RetroButton>
              <RetroButton variant="back" onClick={() => go("menu")}>
                Back to menu
              </RetroButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
