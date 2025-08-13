import React, {
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  forwardRef,
} from "react";

function clampDigit(ch) {
  return /\d/.test(ch) ? ch : "";
}

const TileInput = forwardRef(function TileInput(
  { onSubmit, disabled = false },
  ref
) {
  const [digits, setDigits] = useState(["", "", "", ""]);
  const inputs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  useImperativeHandle(ref, () => ({
    getValue: () => digits.join(""),
    clear: () => setDigits(["", "", "", ""]),
    focus: () => inputs[0].current?.focus(),
  }));

  useEffect(() => {
    if (!disabled) inputs[0].current?.focus();
  }, [disabled]);

  const handleChange = (i, val) => {
    if (disabled) return;
    const d = clampDigit(val.slice(-1));
    setDigits((prev) => {
      const next = [...prev];
      next[i] = d;
      return next;
    });
    if (d && i < 3) inputs[i + 1].current?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (disabled) return;
    if (e.key === "Backspace") {
      e.preventDefault();
      setDigits((prev) => {
        const next = [...prev];
        if (next[i]) {
          next[i] = "";
        } else if (i > 0) {
          next[i - 1] = "";
          inputs[i - 1].current?.focus();
        }
        return next;
      });
    } else if (e.key === "Enter") {
      const val = digits.join("");
      if (val.length === 4) onSubmit?.(val);
    } else if (!/\d/.test(e.key) && e.key.length === 1) {
      // block non-digits
      e.preventDefault();
    }
  };

  return (
    <div className="tiles" aria-label="Enter 4-digit guess">
      {digits.map((d, i) => (
        <div key={i} className="tile">
          <input
            inputMode="numeric"
            pattern="\d*"
            maxLength={1}
            ref={inputs[i]}
            value={d}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            disabled={disabled}
            aria-label={`Digit ${i + 1}`}
          />
        </div>
      ))}
    </div>
  );
});

export default TileInput;
