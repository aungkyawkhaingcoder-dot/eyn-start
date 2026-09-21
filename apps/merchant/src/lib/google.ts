interface GoogleIdentityService {
  initialize(options: {
    client_id: string;
    nonce: string;
    auto_select: boolean;
    callback: (result: { credential: string }) => void;
  }): void;
  renderButton(
    element: HTMLElement,
    options: { theme: string; size: string; text: string; width: number },
  ): void;
}
declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdentityService } };
  }
}
let loading: Promise<GoogleIdentityService> | undefined;
export function loadGoogle() {
  if (window.google?.accounts?.id)
    return Promise.resolve(window.google.accounts.id);
  if (loading) return loading;
  loading = new Promise<GoogleIdentityService>((resolve, reject) => {
    const script = document.createElement("script");
    const timer = setTimeout(() => fail(), 15000);
    function fail() {
      clearTimeout(timer);
      script.remove();
      loading = undefined;
      reject(
        new Error(
          "Google could not load. Check your connection or content blocker.",
        ),
      );
    }
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => {
      clearTimeout(timer);
      if (window.google?.accounts?.id) resolve(window.google.accounts.id);
      else fail();
    };
    script.onerror = fail;
    document.head.appendChild(script);
  });
  return loading;
}
