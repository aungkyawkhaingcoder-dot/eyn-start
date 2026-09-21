const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
let messages;
let outcome;
const sdkPath = require.resolve('resend');
require.cache[sdkPath] = {
  id: sdkPath, filename: sdkPath, loaded: true,
  exports: { Resend: function(apiKey) {
    assert.equal(apiKey, 'test-key');
    this.emails = { async send(message) {
      messages.push(message);
      if (outcome instanceof Error) throw outcome;
      return outcome;
    } };
  } },
};
const { sendVerificationEmail } = require('../src/services/email/index.ts');
const { OTP_EXPIRY_MINUTES } = require('../src/utils/index.ts');
beforeEach(() => {
  process.env.EMAIL_PROVIDER = 'resend';
  process.env.EMAIL_FROM = 'Test App <noreply@example.com>';
  process.env.RESEND_API_KEY = 'test-key';
  messages = []; outcome = { data: { id: 'email-id' }, error: null };
});
test('sends a single email with leading-zero OTP and shared expiry', async () => {
  await sendVerificationEmail(' user@example.com ', '012345');
  assert.equal(messages.length, 1);
  assert.equal(messages[0].to, 'user@example.com');
  assert.equal(messages[0].from, process.env.EMAIL_FROM);
  assert.match(messages[0].text, /012345/);
  assert.ok(messages[0].text.includes(`${OTP_EXPIRY_MINUTES} minutes`));
});
test('supports numeric codes', async () => {
  await sendVerificationEmail('user@example.com', 123456);
  assert.match(messages[0].text, /123456/);
});
test('invalid recipients and OTPs never reach provider', async () => {
  for (const email of ['invalid', 'a@example.com,b@example.com', 'a@example.com\r\nBcc: b@example.com']) {
    await assert.rejects(sendVerificationEmail(email, '123456'), e => e.code === 'Error_InvalidEmail');
  }
  for (const otp of ['123', '12345x', '<12345>']) {
    await assert.rejects(sendVerificationEmail('user@example.com', otp), e => e.code === 'Error_InvalidOTP');
  }
  assert.equal(messages.length, 0);
});
test('missing credentials and unsupported provider fail closed', async () => {
  for (const key of ['EMAIL_FROM', 'RESEND_API_KEY']) {
    const value = process.env[key]; delete process.env[key];
    await assert.rejects(sendVerificationEmail('user@example.com', 123456), e => e.code === 'Error_EmailConfiguration');
    process.env[key] = value;
  }
  process.env.EMAIL_PROVIDER = 'ses';
  await assert.rejects(sendVerificationEmail('user@example.com', 123456), e => e.code === 'Error_EmailConfiguration');
  assert.equal(messages.length, 0);
});
test('SDK errors, empty results and network failures never look successful or leak data', async () => {
  for (const result of [
    { data: null, error: { message: 'secret-code-123456' } },
    { data: null, error: null },
    new Error('secret-api-key'),
  ]) {
    outcome = result;
    await assert.rejects(sendVerificationEmail('user@example.com', 123456), error => {
      assert.equal(error.status, 503); assert.equal(error.code, 'Error_EmailSendFailed');
      assert.ok(!error.message.includes('secret')); return true;
    });
  }
});
