import { expect, test } from "@playwright/test";

test("home page presents the game and authentication routes", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: /Can you tell what is real/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Play your first round" }),
  ).toHaveAttribute("href", "/sign-up?next=%2Fapp%2Fplay");
  await expect(page.getByText("The GeoGuessr of AI detection")).toBeVisible();
});
