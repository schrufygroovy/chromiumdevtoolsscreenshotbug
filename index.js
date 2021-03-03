const puppeteer = require('puppeteer');
const fs = require('fs');

function processClip(clip) {
    const x = Math.round(clip.x);
    const y = Math.round(clip.y);
    const width = Math.round(clip.width + clip.x - x);
    const height = Math.round(clip.height + clip.y - y);
    return { x, y, width, height, scale: 1 };
}

async function captureScreenshot(page, element, fileName)
{
    const box = await element.boundingBox();
    const { visualViewport: { pageX, pageY } } = await page._client.send('Page.getLayoutMetrics');
    const clip = Object.assign({}, box);
    clip.x += pageX;
    clip.y += pageY;
    
    await page.waitForTimeout(1000);
    const result = await page._client.send('Page.captureScreenshot', {
        format: 'png',
        clip: processClip(clip),
        captureBeyondViewport: true,
        fromSurface: true
    });
    await page.waitForTimeout(1000);
    await fs.promises.writeFile(fileName, Buffer.from(result.data, 'base64'));
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
    await captureScreenshot(page, el, './gaxi.png');

    // solution according to https://bugs.chromium.org/p/chromium/issues/detail?id=1183235#c8
    // "scroll to the node beginning"
    await page._client.send('DOM.scrollIntoViewIfNeeded', {
        objectId: el._remoteObject.objectId,
    });
    await captureScreenshot(page, el, './scrolltonodebeginning1.png');
    // maybe "scroll to the node beginning" means top of the page
    await page.evaluate(_ => {
        window.scrollTo(0, 0);
    });
    await page.waitForTimeout(500);
    await captureScreenshot(page, el, './scrolltonodebeginning2.png');
    // "scroll to the node beginning" with JavaScript
    const box = await el.boundingBox();
    const nodeY = box.y;
    await page.evaluate(y => {
        window.scrollTo(0, y);
    }, nodeY);
    await page.waitForTimeout(500);
    await captureScreenshot(page, el, './scrolltonodebeginning3.png');

    await page.close();
    await browser.close();
}

start();
