import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost:5173",
  pretendToBeVisual: true,
});
for (const name of [
  "window",
  "document",
  "navigator",
  "HTMLElement",
  "HTMLInputElement",
  "HTMLTextAreaElement",
  "HTMLButtonElement",
  "Element",
  "Node",
  "MutationObserver",
  "getComputedStyle",
  "requestAnimationFrame",
  "cancelAnimationFrame",
  "Event",
  "MouseEvent",
  "FocusEvent",
  "KeyboardEvent",
  "SVGElement",
]) {
  Object.defineProperty(globalThis, name, {
    configurable: true,
    value: (dom.window as any)[name],
  });
}
dom.window.Element.prototype.getAnimations = () => [];
Object.defineProperty(globalThis, "CSS", {
  value: { escape: (value: string) => value },
});
Object.defineProperty(globalThis, "ResizeObserver", {
  value: class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
});
const React = await import("react");
const { render, fireEvent, screen, waitFor, cleanup } =
  await import("@testing-library/react");
const { default: App } = await import("../src/App");

test("HeroUI email registration carries proofs through OTP/password, then checks and logs out", async () => {
  const { api } = await import("../src/lib/axios");
  const original = api.defaults.adapter;
  const requests: { path: string; body: any }[] = [];
  api.defaults.adapter = async (config) => {
    const path = config.url!;
    const body = config.data ? JSON.parse(config.data) : {};
    requests.push({ path, body });
    const data = path.endsWith("/register")
      ? { email: "person@example.com", token: "send-proof" }
      : path.endsWith("/verify-otp")
        ? { verifyToken: "verified-proof" }
        : path.endsWith("/confirm-password")
          ? { userId: 7, message: "Created" }
          : path.endsWith("/user")
            ? { currentUserId: 7 }
            : { message: "Logged out" };
    return { data, status: 200, statusText: "OK", headers: {}, config };
  };
  try {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    fireEvent.change(screen.getByLabelText(/Email address/), {
      target: { value: "person@example.com" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /Send verification code/ }),
    );
    await screen.findByLabelText(/Verification code/);
    fireEvent.change(screen.getByLabelText(/Verification code/), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Verify code/ }));
    await screen.findByLabelText(/Password/);
    fireEvent.change(screen.getByLabelText(/Password/), {
      target: { value: "12345678" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Create account →/ }));
    await screen.findByText("User #7");
    assert.equal(requests[1].body.token, "send-proof");
    assert.equal(requests[2].body.token, "verified-proof");
    assert.equal(document.body.textContent?.includes("verified-proof"), false);
    fireEvent.click(
      screen.getByRole("button", { name: /Send 3 parallel requests/ }),
    );
    await screen.findByText(/3\/3 concurrent/);
    assert.equal(requests.filter((r) => r.path.endsWith("/user")).length, 3);
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await screen.findByText("Not checked / signed out");
    fireEvent.click(screen.getByRole("tab", { name: /Phone/ }));
    await screen.findByLabelText(/Phone number/);
    fireEvent.click(screen.getByRole("tab", { name: /Google/ }));
    await screen.findByRole("button", { name: /Start Google sign-in/ });
  } finally {
    cleanup();
    api.defaults.adapter = original;
  }
});

test("useRequest is manual and displays server errors without automatic retries", async () => {
  const { api } = await import("../src/lib/axios");
  const { AxiosError } = await import("axios");
  const original = api.defaults.adapter;
  let calls = 0;
  api.defaults.adapter = async (config) => {
    calls++;
    throw new AxiosError("Denied", "ERR_BAD_REQUEST", config, undefined, {
      data: { message: "Email or password is incorrect." },
      status: 401,
      statusText: "Unauthorized",
      headers: {},
      config,
    });
  };
  try {
    render(<App />);
    assert.equal(calls, 0);
    fireEvent.change(screen.getByLabelText(/Email address/), {
      target: { value: "person@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Password/), {
      target: { value: "12345678" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in →" }));
    await screen.findByRole("alert");
    assert.match(screen.getByRole("alert").textContent || "", /incorrect/);
    assert.equal(calls, 1);
    await waitFor(() =>
      assert.equal(
        screen
          .getByRole("button", { name: "Sign in →" })
          .hasAttribute("disabled"),
        false,
      ),
    );
  } finally {
    cleanup();
    api.defaults.adapter = original;
  }
});
