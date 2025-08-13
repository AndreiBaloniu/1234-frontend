import { useEffect, useRef, useState } from "react";
export default function TileInput({ onSubmit, disabled }) {
  const [vals, setVals] = useState(["", "", "", ""]);
  const refs = [useRef(null), useRef(null), useRef(null), useRef(null)];
  useEffect(() => {
    if (!disabled) refs[0].current?.focus();
  }, [disabled]);
  const setAt = (i, ch) => {
    const v = [...vals];
    v[i] = ch;
    setVals(v);
  };
  const handleChange = (i, e) => {
    const d = e.target.value.replace(/\D/g, "").slice(-1);
    setAt(i, d);
    if (d && i < 3) refs[i + 1].current?.focus();
  };
  const handleKey = (i, e) => {
    if (e.key === "Backspace" && !vals[i] && i > 0) {
      refs[i - 1].current?.focus();
    }
    if (e.key === "ArrowLeft" && i > 0) {
      refs[i - 1].current?.focus();
    }
    if (e.key === "ArrowRight" && i < 3) {
      refs[i + 1].current?.focus();
    }
    if (e.key === "Enter") {
      trySubmit();
    }
  };
  const trySubmit = () => {
    const g = vals.join("");
    if (/^\d{4}$/.test(g) && !disabled) {
      onSubmit(g);
      setVals(["", "", "", ""]);
      refs[0].current?.focus();
    }
  };
  return (
    <div className="tiles">
      {[0, 1, 2, 3].map((i) => (
        <div className="tile" key={i}>
          <input
            ref={refs[i]}
            inputMode="numeric"
            maxLength={1}
            value={vals[i]}
            onChange={(e) => handleChange(i, e)}
            onKeyDown={(e) => handleKey(i, e)}
            disabled={disabled}
          />
        </div>
      ))}
    </div>
  );
}
