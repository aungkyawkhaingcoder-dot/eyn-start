import { Button, Spinner } from "@heroui/react";
import { GoogleIcon } from "./GoogleIcon";
import { useGoogleAuth } from "../hooks/useGoogleAuth";
import type { Workbench } from "../hooks/useWorkbench";

export function GoogleSignIn({ workbench }: { workbench: Workbench }) {
  const { busy, disabled, startGoogle } = useGoogleAuth(workbench);
  return (
    <div className="google-panel">
      <Button className="social-login" variant="secondary" fullWidth isPending={busy} isDisabled={disabled} onPress={startGoogle}>
        {busy ? <Spinner size="sm" color="current" /> : <GoogleIcon />}
        <span>{busy ? "Opening Google" : "Continue with Google"}</span>
      </Button>
      <p className="social-caption">Sign in or create your EYN account.</p>
    </div>
  );
}
