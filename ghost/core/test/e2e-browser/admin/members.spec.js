const {expect, test} = require('@playwright/test');
const {createMember} = require('../utils/e2e-browser-utils');

test.describe('Admin', () => {
    test.describe('Members', () => {
        test('A member can be created', async ({page}) => {
            await page.goto('/ghost');
            await page.locator('.gh-nav a[href="#/members/"]').click();
            await page.waitForSelector('a[href="#/members/new/"] span');
            await page.locator('a[href="#/members/new/"] span:has-text("New member")').click();
            await page.waitForSelector('input[name="name"]');
            let name = 'Test Member';
            let email = 'tester@testmember.com';
            let note = 'This is a test member';
            let label = 'Test Label';
            await page.fill('input[name="name"]', name);
            await page.fill('input[name="email"]', email);
            await page.fill('textarea[name="note"]', note);
            await page.locator('label:has-text("Labels") + div').click();
            await page.keyboard.type(label);
            await page.keyboard.press('Tab');
            await page.locator('button span:has-text("Save")').click();
            await page.waitForSelector('button span:has-text("Saved")');
            await page.locator('.gh-nav a[href="#/members/"]').click();
            const count = await page.locator('tbody > tr').count();
            expect(count).toBe(1);
            const member = page.locator('tbody > tr > a > div > div > h3').nth(0);
            await expect(member).toHaveText(name);
            const memberEmail = page.locator('tbody > tr > a > div > div > p').nth(0);
            await expect(memberEmail).toHaveText(email);
        });

        test('A member can be edited', async ({page}) => {
            await page.goto('/ghost');
            await page.locator('.gh-nav a[href="#/members/"]').click();
            await page.locator('tbody > tr > a').nth(0).click();
            await page.waitForSelector('input[name="name"]');
            let name = 'Test Member Edited';
            let email = 'tester.edited@example.com';
            let note = 'This is an edited test member';
            await page.fill('input[name="name"]', name);
            await page.fill('input[name="email"]', email);
            await page.fill('textarea[name="note"]', note);
            await page.locator('label:has-text("Labels") + div').click();
            await page.keyboard.press('Backspace');
            await page.locator('body').click(); // this is to close the dropdown & lose focus
            await page.locator('input[name="subscribed"] + span').click();
            await page.locator('button span:has-text("Save")').click();
            await page.waitForSelector('button span:has-text("Saved")');
            await page.locator('.gh-nav a[href="#/members/"]').click();
            const count = await page.locator('tbody > tr').count();
            expect(count).toBe(1);
            const member = page.locator('tbody > tr > a > div > div > h3').nth(0);
            await expect(member).toHaveText(name);
            const memberEmail = page.locator('tbody > tr > a > div > div > p').nth(0);
            await expect(memberEmail).toHaveText(email);
        });

        test('A member can be impersonated', async ({page}) => {
            await page.goto('/ghost');
            await page.locator('.gh-nav a[href="#/members/"]').click();
            await page.locator('tbody > tr > a').nth(0).click();
            await page.waitForSelector('[data-test-button="member-actions"]');
            await page.locator('[data-test-button="member-actions"]').click();
            await page.getByRole('button', {name: 'Impersonate'}).click();
            await page.getByRole('button', {name: 'Copy link'}).click();
            await page.waitForSelector('button span:has-text("Link copied")');
            // get value from input because we don't have access to the clipboard during headless testing
            const elem = await page.$('input[name="member-signin-url"]');
            const link = await elem.inputValue();
            await page.goto(link);            
            await page.frameLocator('#ghost-portal-root iframe[title="portal-trigger"]').locator('div').nth(1).click();
            const title = await page.frameLocator('#ghost-portal-root div iframe[title="portal-popup"]').locator('h2').innerText();
            await expect(title).toEqual('Your account'); // this is the title of the popup when member is logged in
        });

        test('A member can be deleted', async ({page}) => {
            await page.goto('/ghost');
            await page.locator('.gh-nav a[href="#/members/"]').click();
            await page.locator('tbody > tr > a').nth(0).click();
            await page.waitForSelector('[data-test-button="member-actions"]');
            await page.locator('[data-test-button="member-actions"]').click();
            await page.getByRole('button', {name: 'Delete member'}).click();
            await page.locator('button[data-test-button="confirm"] span:has-text("Delete member")').click();
            // should have no members now, so we should see the empty state
            expect(await page.locator('div h4:has-text("Start building your audience")')).not.toBeNull();
        });

        const membersFixture = [
            {
                name: 'Test Member 1',
                email: 'test@member1.com',
                note: 'This is a test member',
                label: 'Test Label'
            },
            {
                name: 'Test Member 2',
                email: 'test@member2.com',
                note: 'This is a test member',
                label: 'Test Label'
            },
            {
                name: 'Test Member 3',
                email: 'test@member3.com',
                note: 'This is a test member',
                label: 'Test Label'
            }
        ];

        test('All members can be exported', async ({page}) => {
            for (let member of membersFixture) {
                await createMember(page, member);
            }
            await page.locator('.gh-nav a[href="#/members/"]').click();
            await page.waitForSelector('button[data-test-button="members-actions"]');
            await page.locator('button[data-test-button="members-actions"]').click();
            await page.waitForSelector('button[data-test-button="export-members"]');
            const [download] = await Promise.all([
                page.waitForEvent('download'),
                page.locator('button[data-test-button="export-members"]').click()
            ]);
            const filename = await download.suggestedFilename();
            expect(filename).toContain('.csv');
        });

        test('A filtered list of members can be exported', async ({page}) => {
            await page.goto('/ghost');
            await page.locator('.gh-nav a[href="#/members/"]').click();
            await page.waitForSelector('button[data-test-button="members-actions"]');
            await page.locator('button[data-test-button="members-actions"]').click();
            await page.waitForSelector('div[data-test-button="members-filter-actions"]');
            await page.locator('div[data-test-button="members-filter-actions"]').click();
            await page.locator('select[data-test-select="members-filter"]').click();
            await page.locator('select[data-test-select="members-filter"]').selectOption('subscribed');
            await page.locator('button[data-test-button="members-apply-filter"]').click();
            await page.locator('button[data-test-button="members-actions"]').click();
            const exportButton = await page.locator('button[data-test-button="export-members"] > span').innerText();
            expect(exportButton).toEqual('Export selected members (3)');
            await page.waitForSelector('button[data-test-button="export-members"]');
            const [download] = await Promise.all([
                page.waitForEvent('download'),
                page.locator('button[data-test-button="export-members"]').click()
            ]);
            const filename = await download.suggestedFilename();
            expect(filename).toContain('.csv');
        });
    });
});
