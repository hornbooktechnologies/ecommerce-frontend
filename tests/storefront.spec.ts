import {test,expect,type APIRequestContext} from '@playwright/test';
import {photo,type ProductList,type ProductDetail} from '../src/features/storefront/data/live-catalog';

// Live catalog reads; writes are confined to new anonymous test bags. Never creates an order.
async function products(request:APIRequestContext,query='pageSize=10'):Promise<ProductList>{
  const response=await request.get('/api/storefront/products?'+query);
  expect(response.ok()).toBe(true);
  const data:ProductList=(await response.json()).data;
  expect(data.items.length).toBeGreaterThan(0);
  return data;
}
test('homepage renders API products, ten per page, and pagination loads another page',async({page,request})=>{
  const data=await products(request);
  await page.goto('/');
  await expect(page.getByRole('region',{name:'Featured campaigns'})).toBeVisible();
  const cards=page.locator('#discover .product-card');
  await expect(cards).toHaveCount(Math.min(10,data.total));
  await expect(cards.first().locator('.product-title')).toHaveText(data.items[0].name);
  if(data.totalPages>1){
    const second=await products(request,'pageSize=10&page=2');
    await page.locator('#discover').getByRole('button',{name:'Next',exact:true}).click();
    await expect(page.locator('#discover .catalog-pagination')).toContainText('Page 2');
    await expect(cards.first().locator('.product-title')).toHaveText(second.items[0].name);
  }
});
test('product details show API images, specifications, separate options and published reviews only',async({page,request})=>{
  const list=await products(request,'inStock=true');
  const response=await request.get('/api/storefront/products/'+list.items[0].slug);
  expect(response.ok()).toBe(true);
  const product:ProductDetail=(await response.json()).data;
  const selected=product.variants.find(item=>item.offerId===product.offerId)||product.variants[0];
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/p/'+product.slug);
  await expect(page.getByRole('heading',{name:product.name,exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Product specifications'})).toBeVisible();
  const colours=[...new Map(product.variants.map(item=>[item.colorId||item.color||'none',item])).values()];
  if(colours.some(item=>item.color)){
    const group=page.getByRole('group',{name:/^Colour/});
    await expect(group.getByRole('button')).toHaveCount(colours.length);
    await expect(group.getByRole('button',{name:selected.color||'Not specified',exact:true})).toHaveAttribute('aria-pressed','true');
  }
  const sizes=[...new Set(product.variants.filter(item=>(item.colorId||item.color)===(selected.colorId||selected.color)).map(item=>item.size||''))];
  if(sizes.some(Boolean)){
    const group=page.getByRole('group',{name:/^Size/});
    await expect(group.getByRole('button')).toHaveCount(sizes.length);
    await expect(group.getByRole('button',{name:selected.size||'Not specified',exact:true})).toHaveAttribute('aria-pressed','true');
  }
  const sellers=page.getByRole('group',{name:/seller offer/i});
  await expect(sellers.getByRole('radio')).toHaveCount(product.variants.filter(item=>item.id===selected.id).length);
  await expect(sellers.locator('input:checked')).toHaveValue(selected.offerId);
  const gallery=product.images.filter(image=>(!image.variantId||image.variantId===selected.id)&&(!image.colorId||image.colorId===selected.colorId)).sort((a,b)=>Number(b.role==='PRIMARY')-Number(a.role==='PRIMARY')||a.sortOrder-b.sortOrder);
  await expect(page.locator('.product-main-image img')).toHaveAttribute('src',photo(gallery[0]?.url||'',1200));
  await expect.poll(()=>page.locator('.product-main-image img').evaluate((image:HTMLImageElement)=>image.complete&&image.naturalWidth>0)).toBe(true);
  if(!product.reviews)await expect(page.getByText('No published reviews yet.')).toBeVisible();
  await page.getByRole('button',{name:'Add to bag',exact:true}).click();
  try{
    await expect(page.locator('[data-sonner-toast][data-type="success"]')).toContainText('Added to your bag');
    await expect(page.getByRole('button',{name:'Added to bag'})).toBeVisible();
    await page.getByRole('link',{name:'View your bag'}).click();
    const items=page.getByRole('region',{name:'Bag items'}).locator('article');
    await expect(items).toHaveCount(1);await expect(items).toContainText(selected.sku);
    await expect(page.getByText('Ready to review your order?')).toBeVisible();
    await page.reload();await expect(items).toHaveCount(1);
  }finally{
    await page.goto('/cart');await page.getByRole('button',{name:'Clear bag',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Your bag has room for something good.'})).toBeVisible();
  }
  expect(errors).toEqual([]);
});
test('Sonner notifications are global, dismissible and mobile-friendly',async({page,request})=>{
  const list=await products(request,'inStock=true');
  await page.goto('/p/'+list.items[0].slug);
  await page.getByRole('button',{name:'Add to bag',exact:true}).click();
  try{
    const notice=page.locator('[data-sonner-toast][data-type="success"]');
    await expect(notice).toContainText('Added to your bag');
    await expect(page.locator('[data-sonner-toaster]')).toHaveCount(1);
    await page.setViewportSize({width:375,height:844});
    const box=await notice.boundingBox();expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(375);
    await notice.getByRole('button',{name:'Close toast'}).click();await expect(notice).toHaveCount(0);
    await expect(page.locator('.toast')).toHaveCount(0);
  }finally{
    await page.goto('/cart');await page.getByRole('button',{name:'Clear bag',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Your bag has room for something good.'})).toBeVisible();
  }
});
test('search uses the catalog API and canonical product links',async({page,request})=>{
  const product=(await products(request)).items[0];
  await page.goto('/');
  await page.locator('header.header').getByRole('textbox',{name:'Search all products',exact:true}).fill(product.name);
  const suggestion=page.locator('.product-suggestions').getByRole('link').filter({hasText:product.name}).first();
  await expect(suggestion).toBeVisible();await suggestion.click();
  await expect(page).toHaveURL(url=>url.pathname==='/p/'+product.slug);
});
test('category filter is remote and empty results are explicit',async({page,request})=>{
  const data=await products(request,'category=electronics&pageSize=10');
  await page.goto('/c/electronics');
  await expect(page.getByRole('heading',{name:'Electronics',exact:true})).toBeVisible();
  await expect(page.locator('.category-product-grid .product-card')).toHaveCount(data.items.length);
  await page.getByRole('spinbutton',{name:'Maximum',exact:true}).fill('0.01');
  await page.getByRole('button',{name:'Apply filters',exact:true}).click();
  await expect(page.getByRole('heading',{name:'No products match these filters'})).toBeVisible();
  await page.getByRole('button',{name:'Reset filters',exact:true}).click();
  await expect(page.locator('.category-product-grid .product-card')).toHaveCount(data.items.length);
});
test('catalog failure has a retry state, never silently substitutes demo products',async({page,request})=>{
  const data=await products(request);
  await page.route('**/api/storefront/products?**',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:{message:'The store is temporarily unavailable.'}})}));
  await page.goto('/');
  await expect(page.locator('#discover').getByRole('alert')).toContainText('temporarily unavailable');
  await expect(page.locator('#discover .product-card')).toHaveCount(0);
  await page.unroute('**/api/storefront/products?**');
  await page.locator('#discover').getByRole('button',{name:'Try again'}).click();
  await expect(page.locator('#discover .product-card')).toHaveCount(data.items.length);
});
test('same-origin proxy rejects tenant overrides and non-catalog paths',async({request})=>{
  expect((await request.get('/api/storefront/products?tenantCode=OTHER')).status()).toBe(422);
  expect((await request.get('/api/storefront/admin')).status()).toBe(404);
  expect((await request.get('/api/storefront/products/not-a-real-product')).status()).toBe(404);
});
test('home, category and detail fit small mobile, tablet and desktop screens',async({page,request},testInfo)=>{
  const product=(await products(request,'inStock=true')).items[0];
  for(const width of [375,768,1440]){
    await page.setViewportSize({width,height:900});
    for(const path of ['/','/c/electronics','/p/'+product.slug]){
      await page.goto(path);await expect(page.locator('h1').first()).toBeVisible();
      const cards=page.locator(path.startsWith('/p/')?'.product-main-image':path==='/'?'#discover .product-card':'.category-product-grid .product-card');
      await expect(cards.first()).toBeVisible();const size=await cards.first().boundingBox();expect(size?.width).toBeGreaterThanOrEqual(140);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
      await page.screenshot({path:testInfo.outputPath(String(width)+'-'+(path==='/'?'home':path.startsWith('/c/')?'category':'product')+'.png'),fullPage:true});
    }
  }
});
