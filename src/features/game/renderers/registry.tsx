import { categoryConfig, type CategoryId } from "@/config/categories";
import { AudioRenderer } from "@/features/game/renderers/audio-renderer";
import { EmailRenderer } from "@/features/game/renderers/email-renderer";
import { ImageRenderer } from "@/features/game/renderers/image-renderer";
import type { Challenge } from "@/features/game/types";

type RegisteredRenderer = ({
  challenge,
}: {
  challenge: Challenge;
}) => React.ReactNode;

function InvalidPayload() {
  return (
    <p className="rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/8 p-5 text-sm text-[#efb4b7]">
      This challenge payload does not match its registered renderer.
    </p>
  );
}

const rendererRegistry: Record<CategoryId, RegisteredRenderer> = {
  image: ({ challenge }) =>
    challenge.payload.kind === "image" ? (
      <ImageRenderer
        challenge={{
          ...challenge,
          payload: challenge.payload,
        }}
        key={challenge.id}
      />
    ) : (
      <InvalidPayload />
    ),
  email: ({ challenge }) =>
    challenge.payload.kind === "email" ? (
      <EmailRenderer payload={challenge.payload} />
    ) : (
      <InvalidPayload />
    ),
  voice: ({ challenge }) =>
    challenge.payload.kind === "audio" ? (
      <AudioRenderer key={challenge.id} payload={challenge.payload} />
    ) : (
      <InvalidPayload />
    ),
};

export function ChallengeRenderer({ challenge }: { challenge: Challenge }) {
  const rendererKey = categoryConfig[challenge.category].rendererKey;
  const Renderer = rendererRegistry[rendererKey];

  return <Renderer challenge={challenge} />;
}
