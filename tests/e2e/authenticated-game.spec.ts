import { expect, test, type Response } from "@playwright/test";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;
type BinaryChoice = "option_a" | "option_b";

async function rememberChallengeAnswers(
  response: Response,
  answers: Map<string, BinaryChoice>,
) {
  if (!response.url().includes("/api/challenges?") || !response.ok()) return;

  const payload: unknown = await response.json().catch(() => null);
  if (!payload || typeof payload !== "object") return;
  const challenges = (payload as { challenges?: unknown }).challenges;
  if (!Array.isArray(challenges)) return;

  for (const challenge of challenges) {
    if (!challenge || typeof challenge !== "object") continue;
    const id = (challenge as { id?: unknown }).id;
    const correctChoice = (challenge as { correctChoice?: unknown })
      .correctChoice;
    if (
      typeof id === "string" &&
      (correctChoice === "option_a" || correctChoice === "option_b")
    ) {
      answers.set(id, correctChoice);
    }
  }
}

test.skip(
  !email || !password,
  "Set E2E_EMAIL and E2E_PASSWORD for the dedicated test account.",
);

test("authenticated player journey", async ({ page }) => {
  test.setTimeout(120_000);
  const answers = new Map<string, BinaryChoice>();
  page.on("response", (response) => {
    void rememberChallengeAnswers(response, answers);
  });

  await page.goto("/sign-in?next=%2Fapp%2Fplay");
  await page.getByLabel("Email").fill(email!);
  await page.getByLabel("Password").fill(password!);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(
    page.getByRole("heading", { name: "Mixed signals" }),
  ).toBeVisible();

  for (const category of [
    "Image detection",
    "Email defense",
    "Voice detection",
  ]) {
    const checkbox = page.getByRole("checkbox", { name: new RegExp(category) });
    if ((await checkbox.getAttribute("aria-checked")) !== "true") {
      await checkbox.click();
    }
  }

  await page.getByRole("button", { name: "Start Arcade" }).click();

  const seenCategories = new Set<string>();
  let forcedIncorrectAnswers = 0;

  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (
      await page
        .getByText("Arcade run complete")
        .isVisible()
        .catch(() => false)
    ) {
      break;
    }

    const challenge = page.getByTestId("challenge-card");
    await expect(challenge).toBeVisible();
    const challengeId = await challenge.getAttribute("data-challenge-id");
    const category = await challenge.getAttribute("data-category");
    expect(challengeId).not.toBeNull();
    expect(category).not.toBeNull();
    seenCategories.add(category!);

    await expect
      .poll(() => answers.get(challengeId!), { timeout: 10_000 })
      .toBeDefined();
    const correctChoice = answers.get(challengeId!)!;
    const shouldMiss = seenCategories.size === 3;
    const selectedChoice = shouldMiss
      ? correctChoice === "option_a"
        ? "option_b"
        : "option_a"
      : correctChoice;
    if (shouldMiss) forcedIncorrectAnswers += 1;

    const choiceIndex = selectedChoice === "option_a" ? 0 : 1;
    const answerButton = page
      .locator("button[aria-keyshortcuts]")
      .nth(choiceIndex);
    await expect(answerButton).toBeEnabled();
    await answerButton.click();

    await expect
      .poll(async () => {
        if (
          await page
            .getByText("Arcade run complete")
            .isVisible()
            .catch(() => false)
        ) {
          return true;
        }
        const nextChallengeId = await page
          .getByTestId("challenge-card")
          .getAttribute("data-challenge-id")
          .catch(() => null);
        return (
          nextChallengeId !== challengeId &&
          page.locator("button[aria-keyshortcuts]").first().isEnabled()
        );
      })
      .toBe(true);
  }

  expect([...seenCategories].sort()).toEqual(["email", "image", "voice"]);
  expect(forcedIncorrectAnswers).toBe(3);
  await expect(page.getByText("Arcade run complete")).toBeVisible();
  await expect(page.getByText(/Progress saved|already saved/)).toBeVisible();

  await page.getByRole("link", { name: "View analytics" }).click();
  await expect(
    page.getByRole("heading", { name: "Your detection record" }),
  ).toBeVisible();
  await expect(
    page.getByText("Analytics are temporarily unavailable"),
  ).not.toBeVisible();
  await expect(
    page
      .getByText("Arcade games", { exact: true })
      .locator("..")
      .locator("p")
      .first(),
  ).not.toHaveText("0");

  await page.goto("/app/training");
  await page.getByRole("button", { name: "Start Training" }).click();
  const trainingAnswer = page.locator("button[aria-keyshortcuts]").first();
  await expect(trainingAnswer).toBeEnabled();
  await trainingAnswer.click();
  await expect(
    page.getByRole("button", { name: "Next challenge" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Finish training" }).click();
  await expect(page.getByText("Training summary")).toBeVisible();

  await page.goto("/app/settings");
  const soundEffects = page.getByRole("checkbox", {
    name: "Sound effects",
  });
  const originalSoundPreference = await soundEffects.isChecked();
  await soundEffects.setChecked(!originalSoundPreference);
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByRole("status")).toHaveText("Settings saved.");

  await page.reload();
  await expect(soundEffects).toBeChecked({
    checked: !originalSoundPreference,
  });

  await soundEffects.setChecked(originalSoundPreference);
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByRole("status")).toHaveText("Settings saved.");

  await page.goto("/app/profile");
  await expect(
    page.getByRole("heading", { name: "Player identity" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign out securely" }).click();
  await expect(page).toHaveURL("/");

  await page.goto("/app");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fapp$/);
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
});
