import { Button } from "@heroui/react";
import { useGoogleAuth } from "../hooks/useGoogleAuth";
import type { Workbench } from "../hooks/useWorkbench";
export function GoogleSignIn({ workbench }: { workbench: Workbench }) {
  const { busy, googleReady, googleButton, startGoogle } =
    useGoogleAuth(workbench);
  return (
    <div className="google-panel">
      <div className="google-mark">G</div>
      <h3>Continue with Google</h3>
      <p>Start a secure challenge, then choose your Google account.</p>
      <Button
        className="primary"
        isDisabled={busy || googleReady}
        onPress={startGoogle}
      >
        {busy
          ? "Please wait…"
          : googleReady
            ? "Choose your account below"
            : "Start Google sign-in →"}
      </Button>
      <div ref={googleButton} className="google-button" />
      <p className="hint">
        Requires your backend Google Client ID and this frontend’s authorized
        origin.
      </p>
    </div>
  );
}
