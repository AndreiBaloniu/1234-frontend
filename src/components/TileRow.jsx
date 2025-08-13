export default function TileRow({ value = "", label }) {
  const cells = (value || "").padEnd(4, " ").slice(0, 4).split("");
  return (
    <div className="row">
      {cells.map((c, i) => (
        <div className="tile" key={i}>
          {c.trim() || "·"}
        </div>
      ))}
      <div className="feedback">{label}</div>
    </div>
  );
}
