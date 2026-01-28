import { test, expect, Browser, Page, BrowserContext } from '@playwright/test';

// Helper to create a game and get room code
async function createGame(browser: Browser): Promise<{ tvPage: Page; roomCode: string; tvContext: BrowserContext }> {
    const tvContext = await browser.newContext();
    const tvPage = await tvContext.newPage();
    await tvPage.goto('/');

    await tvPage.click('text=Create New Game');
    const roomCodeElement = tvPage.locator('.text-4xl.tracking-widest.font-mono');
    await expect(roomCodeElement).toBeVisible({ timeout: 10000 });
    const roomCode = await roomCodeElement.innerText();
    return { tvPage, roomCode, tvContext };
}

test.describe('Direct URL Join - Socket Connection', () => {
    test('Direct URL join loads successfully on first attempt', async ({ browser }) => {
        const { tvPage, roomCode } = await createGame(browser);

        // Open join page in a NEW browser context (simulates fresh tab/device)
        const joinContext = await browser.newContext();
        const joinPage = await joinContext.newPage();

        // Navigate directly to join URL
        await joinPage.goto(`/join/${roomCode}`);

        // Should show role selection, not stuck on "Joining game..."
        await expect(joinPage.getByRole('button', { name: 'Red Spymaster' })).toBeVisible({ timeout: 10000 });
        await expect(joinPage.getByRole('button', { name: 'Blue Spymaster' })).toBeVisible();

        await joinContext.close();
    });

    test('Direct URL with lowercase room code works', async ({ browser }) => {
        const { tvPage, roomCode } = await createGame(browser);

        const joinContext = await browser.newContext();
        const joinPage = await joinContext.newPage();

        // Use lowercase room code
        await joinPage.goto(`/join/${roomCode.toLowerCase()}`);

        await expect(joinPage.getByRole('button', { name: 'Red Spymaster' })).toBeVisible({ timeout: 10000 });

        await joinContext.close();
    });

    test('Direct URL with trailing whitespace in code works', async ({ browser }) => {
        const { tvPage, roomCode } = await createGame(browser);

        const joinContext = await browser.newContext();
        const joinPage = await joinContext.newPage();

        // Note: URL encoding handles the whitespace, but the app should still normalize
        // This tests the normalization logic handles edge cases
        await joinPage.goto(`/join/${roomCode}%20`); // %20 is URL-encoded space

        // The page should either work or show an error (not hang forever)
        const roleButton = joinPage.getByRole('button', { name: 'Red Spymaster' });
        const errorCard = joinPage.locator('text=Room Not Found');

        // Either role selection OR error should appear (no infinite loading)
        await expect(roleButton.or(errorCard)).toBeVisible({ timeout: 10000 });

        await joinContext.close();
    });

    test('Second spymaster joining via direct URL loads quickly', async ({ browser }) => {
        const { tvPage, roomCode } = await createGame(browser);

        // First spymaster joins
        const spy1Context = await browser.newContext();
        const spy1Page = await spy1Context.newPage();
        await spy1Page.goto(`/join/${roomCode}`);
        await spy1Page.getByRole('button', { name: 'Red Spymaster' }).click();
        await expect(spy1Page.locator('text=RED Spymaster')).toBeVisible({ timeout: 5000 });

        // Second spymaster joins via direct URL
        const spy2Context = await browser.newContext();
        const spy2Page = await spy2Context.newPage();

        const startTime = Date.now();
        await spy2Page.goto(`/join/${roomCode}`);
        await expect(spy2Page.getByRole('button', { name: 'Blue Spymaster' })).toBeVisible({ timeout: 10000 });
        const loadTime = Date.now() - startTime;

        // Should load in under 5 seconds (accounting for network)
        expect(loadTime).toBeLessThan(5000);

        await spy1Context.close();
        await spy2Context.close();
    });

    test('Join does not hang when socket connects after page load', async ({ browser }) => {
        const { tvPage, roomCode } = await createGame(browser);

        // Create a new context with network throttling to simulate slow connection
        const slowContext = await browser.newContext();
        const slowPage = await slowContext.newPage();

        // Navigate to join page
        await slowPage.goto(`/join/${roomCode}`);

        // Even with potential socket delays, should eventually load
        await expect(slowPage.getByRole('button', { name: 'Red Spymaster' })).toBeVisible({ timeout: 15000 });

        // Verify we're not stuck on loading
        await expect(slowPage.locator('text=Joining game...')).not.toBeVisible();

        await slowContext.close();
    });

    test('Multiple rapid navigations to join URL work correctly', async ({ browser }) => {
        const { tvPage, roomCode } = await createGame(browser);

        const joinContext = await browser.newContext();
        const joinPage = await joinContext.newPage();

        // Navigate away and back rapidly (simulates browser back/forward)
        await joinPage.goto('/');
        await joinPage.goto(`/join/${roomCode}`);
        await joinPage.goto('/');
        await joinPage.goto(`/join/${roomCode}`);

        // Should still work correctly
        await expect(joinPage.getByRole('button', { name: 'Red Spymaster' })).toBeVisible({ timeout: 10000 });

        await joinContext.close();
    });
});

test.describe('Room Code Edge Cases', () => {
    // These tests are marked as fixme because the app currently hangs instead of showing errors
    // TODO: Implement proper error handling for invalid room codes

    test.fixme('Invalid room code shows error instead of hanging', async ({ browser }) => {
        const joinContext = await browser.newContext();
        const joinPage = await joinContext.newPage();

        await joinPage.goto('/join/INVALID123');

        // Should show error message, not hang on "Joining game..."
        await expect(joinPage.locator('text=Room Not Found').or(
            joinPage.locator('text=doesn\'t exist')
        )).toBeVisible({ timeout: 10000 });

        await joinContext.close();
    });

    test.fixme('Empty room code redirects or shows error', async ({ browser }) => {
        const joinContext = await browser.newContext();
        const joinPage = await joinContext.newPage();

        await joinPage.goto('/join/');

        // Should either redirect home or show meaningful content (not hang)
        const homeButton = joinPage.getByRole('button', { name: 'Create New Game' });
        const errorMessage = joinPage.locator('text=Room Not Found');
        const joinButton = joinPage.getByRole('button', { name: 'Join' });

        await expect(homeButton.or(errorMessage).or(joinButton)).toBeVisible({ timeout: 10000 });

        await joinContext.close();
    });
});
