import { test, expect } from "@playwright/test";

test("public login page exposes the expected authentication controls", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
  await expect(page.getByRole("button", { name: "Se connecter" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Créer un compte" })).toBeVisible();
});

test("Android download link points to the stable latest release", async ({ page }) => {
  await page.goto("/");
  const download = page.getByRole("link", { name: "Télécharger l’application Android" });
  await expect(download).toBeVisible();
  await expect(download).toHaveAttribute(
    "href",
    "https://github.com/valeryyacinthe-gif/GESTFARM-Android/releases/latest/download/app-debug.apk"
  );
});

test("signup form validates password confirmation without creating an account", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Créer un compte" }).click();
  await expect(page.getByText("Nom complet")).toBeVisible();
  await expect(page.getByText("Confirmer le mot de passe")).toBeVisible();

  const passwordFields = page.locator('input[type="password"]');
  await passwordFields.nth(0).fill("TestGestfarm123");
  await passwordFields.nth(1).fill("Different12345");

  await expect(passwordFields.nth(1)).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText("Les deux mots de passe ne correspondent pas.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Créer mon compte" })).toBeDisabled();
});

test("mobile login page has no horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1);
});
