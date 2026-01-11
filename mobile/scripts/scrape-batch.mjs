import * as cheerio from 'cheerio';

const fighters = process.argv.slice(2);

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function scrape(id) {
  const url = 'http://ufcstats.com/fighter-details/' + id;
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
  });
  const html = await response.text();
  const $ = cheerio.load(html);

  const stats = {};
  $('li.b-list__box-list-item').each((_, el) => {
    const title = $(el).find('i.b-list__box-item-title').text().trim().toLowerCase();
    const value = $(el).text().replace($(el).find('i.b-list__box-item-title').text(), '').trim();

    if (title.includes('slpm')) stats.slpm = parseFloat(value) || null;
    else if (title.includes('sapm')) stats.sapm = parseFloat(value) || null;
    else if (title.includes('str. acc')) stats.str_acc = parseInt(value) || null;
    else if (title.includes('str. def')) stats.str_def = parseInt(value) || null;
    else if (title.includes('td avg')) stats.td_avg = parseFloat(value) || null;
    else if (title.includes('td acc')) stats.td_acc = parseInt(value) || null;
    else if (title.includes('td def')) stats.td_def = parseInt(value) || null;
    else if (title.includes('sub. avg')) stats.sub_avg = parseFloat(value) || null;
  });
  return stats;
}

async function main() {
  const results = [];
  let count = 0;
  for (const id of fighters) {
    count++;
    process.stderr.write(`[${count}/${fighters.length}] `);
    try {
      const stats = await scrape(id);
      if (stats.slpm !== null || stats.sapm !== null) {
        results.push({id, ...stats});
        process.stderr.write('✓\n');
      } else {
        process.stderr.write('- (no stats)\n');
      }
    } catch (e) {
      process.stderr.write('✗\n');
    }
    await sleep(800);
  }
  console.log(JSON.stringify(results));
}

main();
