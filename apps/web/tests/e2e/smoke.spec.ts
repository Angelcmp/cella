import { test, expect } from "@playwright/test";

test.describe("Cella E2E", () => {
  test("landing page loads and links to /zen", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByText("Analiza tus PDFs con IA")
    ).toBeVisible();
    await page.getByRole("link", { name: "Abrir Cella" }).first().click();
    await expect(page).toHaveURL(/\/zen/);
  });

  test("docs page renders sections", async ({ page }) => {
    await page.goto("/docs");
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  });

  test("zen empty state shows upload zone", async ({ page }) => {
    await page.goto("/zen");
    await expect(page.getByText("Bienvenido a Cella")).toBeVisible();
    await expect(page.getByText("Arrastra tu archivo aquí")).toBeVisible();
  });
});
