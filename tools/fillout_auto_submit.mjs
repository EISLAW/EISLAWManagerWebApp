import { chromium } from 'playwright'

function arg(key, def=''){
  const ix = process.argv.indexOf(`--${key}`)
  if(ix>=0 && ix+1<process.argv.length) return process.argv[ix+1]
  return def
}

function buildUrl(base, params){
  const u = new URL(base)
  for(const [k,v] of Object.entries(params||{})){
    if(v!==undefined && v!==null && String(v).length>0){
      u.searchParams.set(k, String(v))
    }
  }
  return u.toString()
}

async function answerPage(page){
  // try to select at least one radio/checkbox, and fill required inputs
  const clicked = []
  // radios
  for(const sel of ['input[type=radio]','[role=radio]']){
    const radios = await page.$$(sel)
    if(radios && radios.length){
      try{ await radios[0].click({force:true}); clicked.push('radio') }catch{}
      break
    }
  }
  // checkboxes
  for(const sel of ['input[type=checkbox]','[role=checkbox]']){
    const cbs = await page.$$(sel)
    if(cbs && cbs.length){
      try{ await cbs[0].click({force:true}); clicked.push('checkbox') }catch{}
      break
    }
  }
  // numeric/text inputs
  const inputs = await page.$$('input:not([type=hidden]):not([type=radio]):not([type=checkbox])')
  for(const el of inputs){
    try{
      const type = (await el.getAttribute('type')) || 'text'
      const val = type==='number' ? '0' : 'בדיקה'
      const ro = await el.isEditable()
      if(ro){ await el.fill(val) }
    }catch{}
  }
  // textareas
  const tas = await page.$$('textarea')
  for(const el of tas){ try{ await el.fill('בדיקה') }catch{} }

  // try to click Next/Continue/Submit
  const labels = ['הבא','המשך','שלח','סיום','Submit','Next','Continue','Finish']
  for(const label of labels){
    const btn = await page.$(`button:has-text("${label}")`)
    if(btn){ try{ await btn.click({timeout:2000}); return true }catch{} }
  }
  // fallback: any primary button
  const any = await page.$('button')
  if(any){ try{ await any.click({timeout:2000}); return true }catch{} }
  return false
}

async function run(){
  const formBase = arg('form', 'https://eislaw.fillout.com/t/t9nJNoMdBgus')
  const email = arg('email')
  const name = arg('name','בדיקת מערכת')
  const business = arg('business','בדיקה בע"מ')
  const phone = arg('phone','0500000000')
  if(!email){ console.error('missing --email'); process.exit(2) }
  const url = buildUrl(formBase, { email, name, business_name: business, phone })
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  await page.goto(url, { waitUntil: 'domcontentloaded' })

  let steps = 0
  let submitted = false
  while(steps < 25){
    steps++
    // attempt answer + navigate
    await page.waitForTimeout(500)
    const ok = await answerPage(page)
    await page.waitForTimeout(800)
    // detect submission success by URL or by presence of a completion text
    const u = page.url()
    if(/thanks|thank|submitted|complete|success/i.test(await page.content())){ submitted = true; break }
    if(!ok){
      // try pressing Enter
      try { await page.keyboard.press('Enter'); } catch{}
    }
  }
  const shot = new URL('./fillout_auto_submit.png', import.meta.url).pathname
  await page.screenshot({ path: shot, fullPage: true }).catch(()=>{})
  await browser.close()
  console.log(JSON.stringify({ ok: submitted, url, steps, screenshot: shot }))
}

run().catch(e=>{ console.error(e); process.exit(1) })

