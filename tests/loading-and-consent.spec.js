import {test,expect} from '@playwright/test';

test('question pagination hides the previous result while its next request is pending',async({page,request})=>{
  const response=await request.get('/api/storefront/products?pageSize=10');
  expect(response.ok()).toBe(true);
  const product=(await response.json()).data.items[0];expect(product).toBeTruthy();
  let release;
  const pending=new Promise(resolve=>{release=resolve;});
  await page.route('**/api/storefront/products/*/questions?**',async route=>{
    const number=Number(new URL(route.request().url()).searchParams.get('page'));
    if(number===2)await pending;
    await route.fulfill({json:{data:{items:[{id:'question-'+number,question:number===1?'Temporary first question':'Temporary second question',answer:'A synthetic published answer.',kind:'ADMIN',answeredAt:'2026-11-16T00:00:00Z'}],total:11,page:number,pageSize:10,totalPages:2}}});
  });
  try{
    await page.goto('/p/'+product.slug);
    const section=page.locator('#questions');
    await expect(section.getByText('Temporary first question')).toBeVisible();
    await section.getByRole('button',{name:'Next',exact:true}).click();
    await expect(section.getByText('Loading published answers…')).toBeVisible();
    await expect(section.getByText('Temporary first question')).toHaveCount(0);
    release();
    await expect(section.getByText('Temporary second question')).toBeVisible();
    await expect(section.getByRole('navigation',{name:'Questions pagination'})).toContainText('Page 2');
  }finally{release();}
});

test('analytics consent expires in an open tab and sends no further events',async({page})=>{
  const at=new Date('2026-11-16T00:00:00Z');
  await page.clock.install({time:at});
  await page.addInitScript(()=>{Object.defineProperty(navigator,'doNotTrack',{configurable:true,value:'0'});Object.defineProperty(navigator,'globalPrivacyControl',{configurable:true,value:false});});
  const events=[];
  await page.route('**/api/merchandising/**',route=>{
    if(new URL(route.request().url()).pathname.endsWith('/events')){
      events.push(route.request().postDataJSON());
      return route.fulfill({json:{data:{recorded:true}}});
    }
    return route.fulfill({json:{data:{enabled:true,privacySignal:false,expiresAt:'2026-11-16T00:01:00Z'}}});
  });
  await page.goto('/');
  await page.getByText('Optional store analytics',{exact:true}).click();
  const consent=page.getByRole('checkbox',{name:/Allow collection views/});
  await expect(consent).toBeChecked();
  await page.clock.fastForward(61000);
  await expect(consent).not.toBeChecked();
  await expect(page.getByRole('button',{name:'Save analytics preference'})).toBeDisabled();
  const before=events.length;
  await page.evaluate(()=>{
    const block=document.createElement('section');block.dataset.merchKind='COLLECTION';block.dataset.merchKey='synthetic-expired';
    block.innerHTML='<a href="/collections/synthetic-expired">Temporary analytics marker</a>';
    document.body.prepend(block);
  });
  await page.getByText('Temporary analytics marker').scrollIntoViewIfNeeded();
  await page.clock.fastForward(2000);
  expect(events).toHaveLength(before);
  await page.evaluate(()=>document.querySelector('[data-merch-key="synthetic-expired"]')?.remove());
});
