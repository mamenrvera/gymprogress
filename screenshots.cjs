const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

async function captureScreenshots() {
  const browser = await chromium.launch({ headless: true });
  
  // Desktop screenshot (1440x900)
  const desktopPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await desktopPage.goto('http://127.0.0.1:5173');
  await desktopPage.waitForLoadState('networkidle');
  await desktopPage.waitForTimeout(1000);
  await desktopPage.screenshot({ path: path.join(__dirname, 'screenshot-desktop.png'), fullPage: true });
  console.log('Desktop screenshot saved');
  
  // Mobile screenshot (390x844)
  const mobilePage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobilePage.goto('http://127.0.0.1:5173');
  await mobilePage.waitForLoadState('networkidle');
  await mobilePage.waitForTimeout(1000);
  await mobilePage.screenshot({ path: path.join(__dirname, 'screenshot-mobile.png'), fullPage: true });
  console.log('Mobile screenshot saved');
  
  // Also capture each main section on desktop
  const sections = ['', '/alimentacion', '/entrenamiento', '/progreso', '/ajustes'];
  for (const section of sections) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`http://127.0.0.1:5173${section}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
    const name = section === '' ? 'inicio' : section.replace('/', '');
    await page.screenshot({ path: path.join(__dirname, `screenshot-desktop-${name}.png`), fullPage: true });
    console.log(`Desktop ${name} screenshot saved`);
    await page.close();
  }
  
  await browser.close();
  console.log('All screenshots captured!');
}

captureScreenshots().catch(console.error);