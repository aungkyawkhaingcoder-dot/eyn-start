"use client";
import { CircleAlert, RotateCw } from "lucide-react";
import { Button, Spinner } from "@heroui/react";
export function Loading() {
  return (
    <div className="loading" role="status" aria-label="Loading">
      <Spinner />
      <span className="sr-only">Loading</span>
    </div>
  );
}
export function Failure({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <div className="empty" role="alert">
      <CircleAlert size={28} aria-hidden="true" />
      <h2>Something needs attention</h2>
      <p>{error.message}</p>
      <Button variant="secondary" onPress={retry}>
        <RotateCw size={16} aria-hidden="true" />
        Try again
      </Button>
    </div>
  );
}
