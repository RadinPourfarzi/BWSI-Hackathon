import { expect, test } from "@playwright/test";

test("home page presents the game and authentication routes", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.getByText("Bot or Not", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /Can you tell what is real/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Play your first round" }),
  ).toHaveAttribute("href", "/app/play");
  await expect(page.getByText("The GeoGuessr of AI detection")).toBeVisible();
});

test("guest can start a Supabase-backed Arcade round", async ({ page }) => {
  test.skip(
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    "Supabase credentials are required for database-backed gameplay.",
  );

  await page.goto("/sign-in?next=%2Fapp%2Fplay");
  await expect(
    page.getByRole("link", { name: "Continue as guest" }),
  ).toHaveAttribute("href", "/app/play");

  await page.goto("/app/play");

  await expect(page.getByText("Playing as guest").first()).toBeVisible();
  const batchResponsePromise = page.waitForResponse((response) =>
    response.url().includes("/api/challenges?"),
  );
  await page.getByRole("button", { name: "Start Arcade" }).click();
  const batchResponse = await batchResponsePromise;
  const batch = (await batchResponse.json()) as {
    challenges: { metadata?: Record<string, unknown> }[];
  };

  expect(batchResponse.ok()).toBe(true);
  expect(batch.challenges.length).toBeGreaterThan(0);
  expect(
    batch.challenges.every((challenge) =>
      String(challenge.metadata?.catalogSource).endsWith("supabase"),
    ),
  ).toBe(true);
  await expect(page.getByTestId("challenge-card")).toBeVisible();
});
