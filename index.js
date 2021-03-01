const puppeteer = require('puppeteer');
const fs = require('fs');

function processClip(clip) {
    const x = Math.round(clip.x);
    const y = Math.round(clip.y);
    const width = Math.round(clip.width + clip.x - x);
    const height = Math.round(clip.height + clip.y - y);
    return { x, y, width, height, scale: 1 };
}

const start = async function() {

    const browser = await puppeteer.launch({
        ignoreHTTPSErrors: true,
        headless: false
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1024, height: 800 });
    
    await page.goto('https://htmlpreview.github.io/?https://github.com/schrufygroovy/chromiumdevtoolsscreenshotbug/blob/master/pageundertest.html', { 'waitUntil': ['load', 'networkidle0']});
    
    const elementSelector = '.elementToScreenshot';
    const el = await page.$(elementSelector);
    await el.click();
    const box = await el.boundingBox();
    const { visualViewport: { pageX, pageY } } = await page._client.send('Page.getLayoutMetrics');
    const clip = Object.assign({}, box);
    clip.x += pageX;
    clip.y += pageY;
    
    await page.waitFor(5000);
    const result = await page._client.send('Page.captureScreenshot', {
        format: 'png',
        clip: processClip(clip),
        captureBeyondViewport: true,
        fromSurface: true
    });
    await fs.promises.writeFile('./gaxi.png', Buffer.from(result.data, 'base64'));

    await page.close();
    await browser.close();
}

start();
