const puppeteer = require('puppeteer');

async function testChrome() {
  console.log('🧪 Testing Chrome launch...');
  
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run'
      ],
      executablePath: '/usr/bin/google-chrome-stable'
    });
    
    console.log('✅ Chrome launched successfully');
    
    const page = await browser.newPage();
    console.log('✅ Page created successfully');
    
    await page.goto('https://web.whatsapp.com', { waitUntil: 'networkidle0', timeout: 30000 });
    console.log('✅ WhatsApp Web loaded successfully');
    
    await browser.close();
    console.log('✅ Test completed successfully');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testChrome();
