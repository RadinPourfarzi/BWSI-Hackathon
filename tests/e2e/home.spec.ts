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

test("guest can start a bundled Arcade round without Supabase", async ({
  page,
}) => {
  await page.goto("/sign-in?next=%2Fapp%2Fplay");
  await expect(
    page.getByRole("link", { name: "Continue as guest" }),
  ).toHaveAttribute("href", "/app/play");

  await page.goto("/app/play");

  await expect(page.getByText("Playing as guest").first()).toBeVisible();
  await page.getByRole("button", { name: "Start Arcade" }).click();
  await expect(page.getByTestId("challenge-card")).toBeVisible();
});
