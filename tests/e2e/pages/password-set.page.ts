import { expect, type Locator, type Page } from '@playwright/test';

export type RuleId = 'minLength' | 'digit' | 'uppercase' | 'special';

/** Page Object: Seite „Passwort festlegen“ (Ziel des Einmal-Links). */
export class PasswordSetPage {
  readonly input: Locator;
  readonly repeat: Locator;
  readonly save: Locator;
  readonly strength: Locator;
  readonly rules: Locator;

  constructor(private readonly page: Page) {
    this.input = page.getByTestId('pw-new-input');
    this.repeat = page.getByTestId('pw-repeat-input');
    this.save = page.getByTestId('password-save');
    this.strength = page.getByTestId('pw-new-strength');
    this.rules = page.getByTestId('pw-new-rules');
  }

  async goto(token: string | null = 'a'.repeat(32)) {
    await this.page.goto(token ? `/passwort-festlegen?token=${token}` : '/passwort-festlegen');
    await expect(this.page.getByTestId('password-set-card')).toBeVisible();
  }

  rule(id: RuleId): Locator {
    return this.page.getByTestId(`rule-${id}`);
  }

  async expectRules(expected: Record<RuleId, boolean>) {
    for (const [id, met] of Object.entries(expected) as Array<[RuleId, boolean]>) {
      await expect(this.rule(id), `Regel ${id}`).toHaveAttribute('data-met', String(met));
    }
  }
}
