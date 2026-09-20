import { useRef, useState, useEffect } from "react";
import { loadGoogle } from "../lib/google";
import type { Workbench } from "./useWorkbench";
export function useGoogleAuth({
  auth,
  run,
  setNotice,
  signedIn,
  busy,
}: Workbench) {
  const [googleReady, setGoogleReady] = useState(false);
  const googleButton = useRef<HTMLDivElement>(null);
  const googleAttempt = useRef(0);
  const googleExpiry = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  useEffect(
    () => () => {
      clearTimeout(googleExpiry.current);
      googleAttempt.current++;
    },
    [],
  );
  function startGoogle() {
    run(async () => {
      const attempt = ++googleAttempt.current;
      clearTimeout(googleExpiry.current);
      setGoogleReady(false);
      googleButton.current?.replaceChildren();
      const google = await loadGoogle();
      const challenge = await auth.googleChallenge();
      if (attempt !== googleAttempt.current) return;
      google.initialize({
        client_id: challenge.clientId!,
        nonce: challenge.nonce!,
        auto_select: false,
        callback: ({ credential }) => {
          if (attempt !== googleAttempt.current) return;
          run(async () => {
            clearTimeout(googleExpiry.current);
            googleAttempt.current++;
            setGoogleReady(false);
            googleButton.current?.replaceChildren();
            signedIn(
              await auth.googleLogin({
                idToken: credential,
                challengeId: challenge.challengeId!,
              }),
            );
          });
        },
      });
      google.renderButton(googleButton.current!, {
        theme: "outline",
        size: "large",
        text: "continue_with",
        width: 280,
      });
      setGoogleReady(true);
      googleExpiry.current = setTimeout(
        () => {
          googleAttempt.current++;
          setGoogleReady(false);
          googleButton.current?.replaceChildren();
          setNotice({
            error: true,
            text: "Google challenge expired. Start Google sign-in again.",
          });
        },
        (challenge.expiresIn || 300) * 1000,
      );
    });
  }

  return { busy, googleReady, googleButton, startGoogle };
}
