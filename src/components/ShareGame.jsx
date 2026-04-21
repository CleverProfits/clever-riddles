import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function ShareGame({ code, joinUrl }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = joinUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="share-game">
      <div className="game-code">
        Game Code: <strong>{code}</strong>
      </div>

      <div className="qr-code-container">
        <QRCodeSVG
          value={joinUrl}
          size={150}
          bgColor="transparent"
          fgColor="#ffffff"
          level="M"
        />
      </div>

      <div className="join-url" onClick={handleCopy}>
        <code>{joinUrl}</code>
        <span className="copy-hint">{copied ? '✓ Copied!' : 'Click to copy'}</span>
      </div>
    </div>
  );
}
