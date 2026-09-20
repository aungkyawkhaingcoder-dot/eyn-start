import { test } from "node:test";
import assert from "node:assert/strict";
import { AxiosError } from "axios";
import { api, request } from "../src/lib/axios";
import { redact } from "../src/lib/redact";
test("shared Axios instance sends cookies and JSON without mobile headers", async () => {
  const original = api.defaults.adapter;
  try {
    api.defaults.adapter = async (config) => {
      assert.equal(config.withCredentials, true);
      assert.equal(config.timeout, 30000);
      assert.equal(config.headers.get("x-platform"), undefined);
      assert.deepEqual(JSON.parse(config.data), { email: "test@example.com" });
      return {
        data: { token: "proof" },
        status: 200,
        statusText: "OK",
        headers: {},
        config,
      };
    };
    assert.equal(
      (await request("/test", { email: "test@example.com" })).data.token,
      "proof",
    );
  } finally {
    api.defaults.adapter = original;
  }
});
test("Axios preserves server errors and does not retry uncertain network mutations", async () => {
  const original = api.defaults.adapter;
  try {
    let calls = 0;
    api.defaults.adapter = async (config) => {
      calls++;
      throw new AxiosError("offline", "ERR_NETWORK", config);
    };
    await assert.rejects(request("/test", {}), { status: "NETWORK" });
    assert.equal(calls, 1);
    api.defaults.adapter = async (config) => {
      throw new AxiosError(
        "Request failed",
        "ERR_BAD_REQUEST",
        config,
        undefined,
        {
          data: { message: "Wait", error: "Error_ResendCooldown" },
          status: 429,
          statusText: "Too Many Requests",
          headers: {},
          config,
        },
      );
    };
    await assert.rejects(request("/test", {}), {
      status: 429,
      message: "Wait",
    });
  } finally {
    api.defaults.adapter = original;
  }
});
test("request history hides nested token proofs and credentials", () => {
  assert.deepEqual(
    redact({
      token: "secret",
      nested: [
        {
          refreshToken: "secret",
          password: "123",
          nonce: "abc",
          message: "ok",
        },
      ],
    }),
    {
      token: "[hidden]",
      nested: [
        {
          refreshToken: "[hidden]",
          password: "[hidden]",
          nonce: "[hidden]",
          message: "ok",
        },
      ],
    },
  );
});
