'use client';
import {useLocalization as useUiLocalization} from '@/localization/provider';
export default function GlobalError({ reset }: { reset: () => void }) {
 const {t: _uiText}=useUiLocalization();

  return (
    <html lang="en-IN">
      <body style={{ fontFamily: 'sans-serif', padding: '10vh 8vw' }}>
        <h1>We couldn’t load the store</h1>
        <p>The catalog is temporarily unavailable. Please try again shortly.</p>
        <button onClick={reset}>{_uiText("Try again")}</button>
      </body>
    </html>
  );
}
