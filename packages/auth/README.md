# Shared browser authentication

Contains EYN's email/phone forms, Google redirect button, request hooks, Axios
transport and response types. Merchant consumes this package directly. Future
Next.js apps can add `@eyn/auth: workspace:*`, configure `NEXT_PUBLIC_API_URL`,
and provide a signed-in navigation callback to `useWorkbench`.

```tsx
const workbench = useWorkbench(() => router.replace('/stores'));
return <AuthCard workbench={workbench} />;
```

Import `AuthCard` from `@eyn/auth/components/AuthCard` and `useWorkbench` from
`@eyn/auth/hooks/useWorkbench` in a client component. Supply a react-hot-toast
Toaster in the app provider and import the EYN UI stylesheet (see merchant).
The Google callback destination is still configured by the backend; multiple
apps will need an allowlisted destination design before sharing that redirect.

Loading belongs to the active action: Google, credentials or resend. Other
actions are disabled while one runs, without showing unrelated spinners.
Tokens are not persisted to browser storage. Server-side auth is in apps/api.
