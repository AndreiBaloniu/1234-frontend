import { useEffect, useState } from "react";
import QRCode from "qrcode";
export default function QRPane({ url }) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    if (!url) return;
    QRCode.toDataURL(url, { margin: 1, width: 320 })
      .then(setSrc)
      .catch(() => setSrc(null));
  }, [url]);
  if (!url) return null;
  return (
    <div className="qrWrap">
      {src ? <img alt="QR" src={src} /> : <div>QR…</div>}
      <div className="small">{url}</div>
    </div>
  );
}
