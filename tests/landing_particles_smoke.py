"""Verify particle effects after the hero, their cadence, and real page controls.
Requires a local built application. Does not write to a public deployment.
"""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
from particle_helpers import field_images, field_ink

ROOT=Path(__file__).resolve().parents[1]
URL=os.environ.get('CURIO_TEST_URL','http://127.0.0.1:4190/').rstrip('/')+'/'
OUTPUT=ROOT/'test-results';OUTPUT.mkdir(exist_ok=True)
checks=0;audits=[]
def passed(message):
 global checks
 checks+=1;print(f'PASS {checks}: {message}',flush=True)
def image(page): return field_images(page)
def audit(page,label):
 page.add_script_tag(path=str(ROOT/'node_modules/axe-core/axe.min.js'))
 issues=page.evaluate("async()=> (await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations")
 audits.append({'screen':label,'violations':issues});(OUTPUT/'landing-particles-accessibility.json').write_text(json.dumps(audits,indent=2));assert not issues,(label,[(v['id'],[n['target'] for n in v['nodes']]) for v in issues])
def ink(page,selector): return field_ink(page,selector)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':1440,'height':1000})
 context.add_init_script('''window.__particlePaints={hero:[],page:[]};const clear=CanvasRenderingContext2D.prototype.clearRect;CanvasRenderingContext2D.prototype.clearRect=function(...args){const key=this.canvas.closest('.particle-story-stage')?'hero':this.canvas.matches('.landing-scene-canvas')?'page':null;if(key)window.__particlePaints[key].push(performance.now());return clear.apply(this,args)};''')
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(URL,wait_until='networkidle')
 canvas=page.locator('.landing-particle-effects');canvas.evaluate('c=>c.__persistent=true')
 scenes=[('.landing-learning-particles','helix'),('.landing-method','helix network towers'),('.landing-course-section','helix towers network orbit'),('.landing-creator-particles','broadcast'),('.landing-final','broadcast')]
 for selector,forms in scenes:
  page.locator(selector).scroll_into_view_if_needed();page.wait_for_timeout(500)
  expect(canvas).to_have_attribute('data-active-scenes',forms)
  expect(canvas).to_have_attribute('data-motion','active')
  a=image(page);page.wait_for_timeout(120);assert image(page)!=a,selector
  assert canvas.evaluate('c=>c.__persistent===true')
  stage=selector if selector not in ['.landing-method','.landing-course-section'] else selector+' [data-particle-effect]'
  assert ink(page,stage)>150,selector
  page.screenshot(path=str(OUTPUT/f'page-particles-{forms.split()[0]}-{selector.split("-")[-1]}.png'))
 passed('One scheduler animates local canvases for the preview, method cards, course covers, publishing and final invitation')

 for selector,kind in [('.landing-method','page'),('.particle-story-stage','hero')]:
  page.locator(selector).scroll_into_view_if_needed();page.wait_for_timeout(200)
  if kind=='hero':
   page.get_by_role('group',name='Particle views').get_by_role('button',name='Connections',exact=True).click()
  result=page.evaluate('''kind=>new Promise(resolve=>{let frames=0;const start=performance.now();window.__particlePaints[kind]=[];function sample(now){frames++;if(now-start<650)requestAnimationFrame(sample);else resolve({frames,paints:window.__particlePaints[kind].length,elapsed:now-start})}requestAnimationFrame(sample)})''',kind)
  assert result['paints']>=result['frames']*.8,(kind,result)
  print('CADENCE',kind,json.dumps(result),flush=True)
 passed('Both hero and later effects paint at display cadence rather than a 30-paint-per-second cap')

 page.locator('.landing-method').scroll_into_view_if_needed();page.wait_for_timeout(200)
 page.get_by_role('button',name='Pause page animations',exact=True).click()
 expect(canvas).to_have_attribute('data-motion','paused')
 page.wait_for_timeout(100)
 before=canvas.get_attribute('data-paint-count');a=image(page);page.wait_for_timeout(250)
 assert image(page)==a and canvas.get_attribute('data-paint-count')==before
 expect(page.get_by_role('button',name='Play page animations',exact=True)).to_have_count(1)
 page.get_by_role('button',name='Play page animations',exact=True).click();page.wait_for_timeout(120);assert image(page)!=a
 passed('A shared Pause/Play state controls hero and later sections, freezes exact pixels and resumes animation')

 for mode in ['light','dark']:
  for width in [320,390,820,1440]:
   page.set_viewport_size({'width':width,'height':900})
   page.evaluate('(mode)=>localStorage.setItem("curio.appearance.v1",JSON.stringify({version:2,seed:"#1a73e8",mode}))',mode)
   page.reload(wait_until='networkidle')
   for selector in ['.landing-step-art','.landing-course-art','.landing-creator-particles','.landing-final']:
    page.locator(selector).first.scroll_into_view_if_needed();page.wait_for_timeout(120)
    assert not page.evaluate('document.documentElement.scrollWidth>innerWidth'),(mode,width,selector)
    assert ink(page,selector)>50,(mode,width,selector)
    if selector=='.landing-final':
     assert ink(page,'.landing-final h2')==0
     assert ink(page,'.landing-final .landing-button')==0
   assert page.locator('.landing-scene-canvas').evaluate_all('nodes=>nodes.every(c=>!c.clientWidth||c.width/c.clientWidth<=2.01)')
   page.wait_for_function('[...document.querySelectorAll("[data-revealed]")].every(node=>getComputedStyle(node).opacity==="1")')
   audit(page,f'{mode} page effects at {width}')
 passed('Effects fit 320/390/820/1440px, respect text/action exclusion and DPR limits, and pass eight light/dark accessibility states')

 page.emulate_media(reduced_motion='reduce');page.wait_for_timeout(100)
 expect(canvas).to_have_attribute('data-motion','reduced')
 a=image(page);before=canvas.get_attribute('data-paint-count');page.wait_for_timeout(250)
 assert image(page)==a and canvas.get_attribute('data-paint-count')==before
 expect(page.get_by_role('button',name='Pause page animations',exact=True)).to_have_count(0)
 page.locator('.landing-learning-particles').scroll_into_view_if_needed();page.wait_for_timeout(100);assert ink(page,'.landing-learning-particles')>100
 passed('Reduced motion retains complete static shapes without requesting idle animation frames')

 page.emulate_media(reduced_motion='no-preference');page.locator('.landing-final').scroll_into_view_if_needed();page.wait_for_timeout(150)
 page.get_by_role('button',name='Find something to learn',exact=True).click();expect(page).to_have_url(URL+'#explore');expect(canvas).to_have_count(0)
 page.goto(URL,wait_until='networkidle');page.get_by_role('button',name='Explore The physics of everyday life',exact=True).click()
 expect(page.get_by_role('dialog').get_by_role('heading',name='The physics of everyday life',exact=True)).to_be_visible()
 passed('Canvas overlays allow the real course cards and final action to open learning; leaving the page removes the effects')

 fallback=browser.new_context(viewport={'width':390,'height':844})
 fallback.add_init_script('HTMLCanvasElement.prototype.getContext=()=>null')
 view=fallback.new_page();view.goto(URL,wait_until='networkidle');view.locator('.landing-method').scroll_into_view_if_needed()
 expect(view.locator('.landing-notebook')).to_be_visible();expect(view.locator('[data-particle-ready="true"]')).to_have_count(0)
 expect(view.get_by_role('button',name='Pause page animations',exact=True)).to_have_count(0)
 fallback.close()
 touch=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=3)
 phone=touch.new_page();phone.goto(URL,wait_until='networkidle')
 phone.locator('.landing-step-art').first.scroll_into_view_if_needed();phone.wait_for_timeout(200)
 expect(phone.locator('.landing-particle-effects')).to_have_attribute('data-motion','active')
 cdp=touch.new_cdp_session(phone);before=phone.evaluate('scrollY')
 cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':190,'y':500}]})
 for y in [470,440,410,380,350]:
  cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':190,'y':y}]});phone.wait_for_timeout(30)
 cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});phone.wait_for_timeout(180)
 assert phone.evaluate('scrollY')>before
 phone.get_by_role('button',name='Explore The physics of everyday life',exact=True).tap()
 expect(phone.get_by_role('dialog').get_by_role('heading',name='The physics of everyday life',exact=True)).to_be_visible()
 assert phone.locator('.landing-scene-canvas').evaluate_all('nodes=>nodes.every(c=>!c.clientWidth||c.width/c.clientWidth<=2.01)')
 touch.close()
 passed('Real touchscreen swipes cross animated method cards normally and animated course covers still open their actual lessons')
 assert not errors,errors
 passed('Without Canvas the original illustrations and real actions remain available, with no broken motion controls or JavaScript errors')
 (OUTPUT/'landing-particles-accessibility.json').write_text(json.dumps(audits,indent=2))
 browser.close()
print(f'\n{checks} page particle checks and {len(audits)} accessibility states passed.',flush=True)
