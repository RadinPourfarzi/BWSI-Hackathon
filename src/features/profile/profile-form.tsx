"use client";

import { LoaderCircle, Save } from "lucide-react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import {
  updateProfile,
  type ProfileActionState,
} from "@/features/profile/actions";

const initialState: ProfileActionState = {};

export function ProfileForm({ displayName }: { displayName: string }) {
  const [state, formAction, pending] = useActionState(
    updateProfile,
    initialState,
  );

  return (
    <form action={formAction}>
      <label className="text-sm font-black" htmlFor="displayName">
        Display name
      </label>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
        <input
          className="h-11 min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[#090d15] px-4 text-sm"
          defaultValue={displayName}
          id="displayName"
          maxLength={40}
          minLength={2}
          name="displayName"
          required
        />
        <Button disabled={pending} type="submit">
          {pending ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Save
        </Button>
      </div>
      {state.error ? (
        <p className="mt-3 text-sm text-[var(--danger)]" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p className="mt-3 text-sm text-[var(--success)]" role="status">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
