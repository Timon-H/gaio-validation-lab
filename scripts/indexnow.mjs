#!/usr/bin/env node

const KEY = process.env.INDEXNOW_KEY;
const HOST = process.env.SITE_HOST;

const body = {
  host: HOST,
  key: KEY,
  keyLocation: `https://${HOST}/${KEY}.txt`,
  urlList: [
    'control',
    'combined',
    'test-jsonld',
    'test-semantic',
    'test-noscript',
    'test-aria',
    'test-dsd',
    'test-microdata',
  ].map(path => `https://${HOST}/${path}`),
};

console.log('Submitting to IndexNow...');
console.log('URLs:', body.urlList);

const res = await fetch('https://api.indexnow.org/IndexNow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify(body),
});

const text = await res.text().catch(() => '(no body)');
console.log(`\nStatus: ${res.status} ${res.statusText}`);
if (text) console.log('Response:', text);

if (res.status === 200) {
  console.log('\n✓ URLs successfully submitted.');
} else if (res.status === 202) {
  console.log('\n✓ Accepted — URLs queued for crawling.');
} else if (res.status === 422) {
  console.log('\n✗ Key file not found or unreachable. Deploy first, then re-run.');
} else {
  console.log('\n✗ Unexpected response. Check status above.');
}
