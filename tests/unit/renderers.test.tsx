// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { createElement, StrictMode, type ImgHTMLAttributes } from "react";
import { describe, expect, it, vi } from "vitest";

import { AudioRenderer } from "@/features/game/renderers/audio-renderer";
import { EmailRenderer } from "@/features/game/renderers/email-renderer";
import { ImageRenderer } from "@/features/game/renderers/image-renderer";
import { makeChallenge } from "../fixtures/challenges";

vi.mock("next/image", () => ({
  default: (
    properties: ImgHTMLAttributes<HTMLImageElement> & {
      alt: string;
      src: string;
      fill?: boolean;
      priority?: boolean;
      unoptimized?: boolean;
    },
  ) => {
    const imageProperties = { ...properties };
    delete imageProperties.fill;
    delete imageProperties.priority;
    delete imageProperties.unoptimized;

    return createElement("img", imageProperties);
  },
}));

describe("challenge renderers", () => {
  it("renders email body content as inert text in a keyboard-scrollable region", () => {
    const payload = {
      kind: "email" as const,
      senderName: "Security",
      senderAddress: "security@example.com",
      subject: "Account notice",
      body: "<script>window.compromised = true</script>",
    };
    const { container } = render(<EmailRenderer payload={payload} />);

    expect(screen.getByText(payload.body)).toBeVisible();
    expect(container.querySelector("script")).toBeNull();
    expect(screen.getByLabelText("Email message body")).toHaveAttribute(
      "tabindex",
      "0",
    );
  });

  it("renders a database-backed email screenshot when one is provided", () => {
    render(
      <EmailRenderer
        payload={{
          kind: "email",
          senderName: "Security",
          senderAddress: "security@example.com",
          subject: "Account notice",
          body: "Inspect the screenshot.",
          screenshotSrc:
            "https://project.supabase.co/storage/v1/object/public/challenges/email/example.png",
        }}
      />,
    );

    expect(
      screen.getByRole("img", { name: "Email screenshot: Account notice" }),
    ).toHaveAttribute(
      "src",
      "https://project.supabase.co/storage/v1/object/public/challenges/email/example.png",
    );
  });

  it("announces image loading and exposes source attribution", () => {
    const challenge = makeChallenge({
      index: 501,
      category: "image",
    });

    if (challenge.payload.kind !== "image") throw new Error("Invalid fixture");

    render(
      <ImageRenderer
        challenge={{
          ...challenge,
          payload: challenge.payload,
        }}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading image challenge",
    );
    fireEvent.load(screen.getByAltText("Fixture image 501"));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByText("Source and attribution")).toBeVisible();
  });

  it("shows audio loading, ready, replay, and failure states", () => {
    const payload = {
      kind: "audio" as const,
      src: "/fixtures/audio.mp3",
    };
    const { container } = render(
      <StrictMode>
        <AudioRenderer payload={payload} />
      </StrictMode>,
    );
    const audio = container.querySelector("audio");

    expect(audio).not.toBeNull();
    expect(audio).toHaveAttribute("src", payload.src);
    expect(screen.getByText("Loading audio")).toBeVisible();
    fireEvent.canPlay(audio!);
    expect(screen.queryByText("Loading audio")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Replay clip" }));
    expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalled();

    fireEvent.error(audio!);
    expect(screen.getByText("Audio playback is unavailable.")).toBeVisible();
  });
});
