import { expect, test } from "@playwright/test";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

test.skip(
  !email || !password,
  "Set E2E_EMAIL and E2E_PASSWORD for the dedicated test account.",
);

test("authenticated Arcade and Training journey", async ({ page }) => {
  await page.goto("/sign-in?next=%2Fapp%2Fplay");
  await page.getByLabel("Email").fill(email!);
  await page.getByLabel("Password").fill(password!);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(
    page.getByRole("heading", { name: "Mixed signals" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Start Arcade" }).click();

  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (
      await page
        .getByText("Arcade run complete")
        .isVisible()
        .catch(() => false)
    ) {
      break;
    }

    const answer = page.locator("button[aria-keyshortcuts]").first();
    await expect(answer).toBeEnabled();
    await answer.click();
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
        return page.locator("button[aria-keyshortcuts]").first().isEnabled();
      })
      .toBe(true);
  }

  await expect(page.getByText("Arcade run complete")).toBeVisible();
  await expect(page.getByText(/Progress saved|already saved/)).toBeVisible();

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
});
