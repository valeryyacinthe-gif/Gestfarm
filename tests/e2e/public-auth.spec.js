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

test("password recovery opens without sending an email", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Mot de passe oublié ?" }).click();
  await expect(page.getByText("Saisis ton adresse e-mail pour recevoir un lien de réinitialisation.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Envoyer le lien" })).toBeVisible();
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Retour à la connexion" })).toBeVisible();
});

test("privacy policy opens from the public login page", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Politique de confidentialité" }).click();
  const dialog = page.getByRole("dialog", { name: "Politique de confidentialité" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Données traitées")).toBeVisible();
});
