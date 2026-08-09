import { test, expect } from "@playwright/test";

test.describe("Cella E2E", () => {
  test("landing page loads and links to /zen", async ({ page, baseURL }) => {
    await page.goto("/");
    await expect(
      page.getByText("Analiza tus PDFs con IA")
    ).toBeVisible();
    await page.getByRole("link", { name: "Abrir Cella" }).first().click();
    await page.waitForURL(/\/zen/, { timeout: 30_000 });
  });

  test("local host root redirects to /zen", async ({ page, baseURL }) => {
    // 127.0.0.1 es local y no está en LANDING_HOSTS → la raíz redirige a /zen
    const url = new URL(baseURL || "http://localhost:3100");
    await page.goto(`http://127.0.0.1:${url.port}/`);
    await page.waitForURL(/\/zen/, { timeout: 30_000 });
  });

  test("docs page renders sections", async ({ page }) => {
    await page.goto("/docs");
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  });

  test("zen empty state shows welcome", async ({ page }) => {
    await page.goto("/zen");
    await expect(page.getByText("Iniciemos tu biblioteca")).toBeVisible();
    await expect(page.getByRole("button", { name: "Aprender un tema nuevo" })).toBeVisible();
  });
});
