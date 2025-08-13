export default function RetroButton({
  children,
  onClick,
  type = "button",
  disabled,
  variant = "", // e.g., "back" or "leave"
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`btn ${variant ? `btn-${variant}` : ""}`}
    >
      {children}
    </button>
  );
}
