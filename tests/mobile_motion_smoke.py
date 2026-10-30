"""Mobile animation workload, compositor scroll alignment and touch regressions.
Run a local built app first. WebKit can use CURIO_WEBKIT_EXECUTABLE.
"""
import os
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect

URL = os.environ.get('CURIO_TEST_URL','http://127.0.0.1:4191/').rstrip('/')+'/'
assert urlparse(URL).hostname in ('127.0.0.1','localhost')
ENGINE = os.environ.get('CURIO_TEST_BROWSER','chromium')
OUTPUT = Path(__file__).resolve().parents[1]/'test-results';OUTPUT.mkdir(exist_ok=True)
checks = 0

def passed(message):
    global checks
    checks+=1;print(f'PASS {checks} [{ENGINE}]: {message}',flush=True)

def progress(page, selector, value):
    page.locator(selector).evaluate('''(scene,value)=>{
      const target=scene.querySelector('.landing-skill-map')||scene.firstElementChild,r=target.getBoundingClientRect();
      scrollTo({top:scrollY+r.top-innerHeight*.85+Math.min(r.height,innerHeight*.65)*value,behavior:'instant'});
    }''',value)
    page.wait_for_timeout(120)

with sync_playwright() as p:
    options={'executable_path':'/usr/bin/chromium','args':['--no-sandbox']} if ENGINE=='chromium' else {}
    if ENGINE=='webkit' and os.environ.get('CURIO_WEBKIT_EXECUTABLE'):options['executable_path']=os.environ['CURIO_WEBKIT_EXECUTABLE']
    browser=getattr(p,ENGINE).launch(**options)
    errors=[]
    for width,height in [(320,568),(390,844),(844,390)]:
        context=browser.new_context(viewport={'width':width,'height':height},is_mobile=True,has_touch=True,device_scale_factor=3)
        context.add_init_script('''window.__motionWork={hero:0,reads:0,pixels:0,draws:0,rafs:0};const raf=requestAnimationFrame;window.requestAnimationFrame=fn=>{window.__motionWork.rafs++;return raf(fn)};const clear=CanvasRenderingContext2D.prototype.clearRect;CanvasRenderingContext2D.prototype.clearRect=function(...args){if(this.canvas.closest('.particle-story-stage'))window.__motionWork.hero++;if(this.canvas.matches('.landing-scene-canvas')){window.__motionWork.draws++;window.__motionWork.pixels+=this.canvas.width*this.canvas.height}return clear.apply(this,args)};const rect=Element.prototype.getBoundingClientRect;Element.prototype.getBoundingClientRect=function(...args){if(this.matches('[data-particle-effect],.particle-story-stage,.landing-particle-story'))window.__motionWork.reads++;return rect.apply(this,args)};''')
        page=context.new_page();page.on('pageerror',lambda error:errors.append(str(error)));page.goto(URL,wait_until='networkidle');page.evaluate('document.fonts.ready')
        stage=page.locator('.particle-story-stage')
        page.get_by_role('group',name='Particle views').get_by_role('button',name='Curio',exact=True).tap()
        box=stage.bounding_box();page.touchscreen.tap(width/2,box['y']+box['height']*.55)
        page.wait_for_timeout(180);expect(stage).to_have_attribute('data-view','phrase')
        page.touchscreen.tap(width/2,box['y']+box['height']*.55)
        expect(stage).to_have_attribute('data-view','curio')
        passed(f'{width}px: lettering taps persist after touch pointer-leave and still work after manual Curio selection')

        art=page.locator('.landing-step-art').first;art.scroll_into_view_if_needed();page.wait_for_timeout(450)
        canvas=art.locator('canvas');expect(art).to_have_attribute('data-particle-ready','true')
        assert canvas.evaluate('n=>n.parentElement.matches("[data-particle-effect]")&&getComputedStyle(n).position==="absolute"')
        assert page.locator('.landing-scene-canvas').evaluate_all('nodes=>nodes.every(n=>n.width/Math.max(1,n.clientWidth)<=2.01)')
        canvas.evaluate('n=>n.__sameMobileField=true');count=canvas.get_attribute('data-particle-count');dimensions=canvas.evaluate('n=>[n.width,n.height]')
        stats=page.evaluate('''()=>new Promise(resolve=>{window.__motionWork={hero:0,reads:0,pixels:0,draws:0,rafs:0};let frames=0;const start=performance.now();function tick(now){frames++;if(now-start<450)requestAnimationFrame(tick);else resolve({...window.__motionWork,frames,viewportPixels:innerWidth*innerHeight*Math.min(devicePixelRatio,2)**2})}requestAnimationFrame(tick)})''')
        assert stats['draws']>=stats['frames']*.8 and stats['reads']==0 and stats['hero']==0,stats
        assert stats['rafs']<=stats['frames']*2.5,stats
        assert stats['pixels']/stats['frames']<stats['viewportPixels']*.65,stats
        passed(f'{width}px: local canvases follow native layout; one visible-field loop, no frame layout reads or offscreen hero draws, bounded paint area')

        page.set_viewport_size({'width':width,'height':height-36});page.wait_for_timeout(140)
        assert canvas.evaluate('n=>n.__sameMobileField') and canvas.get_attribute('data-particle-count')==count
        assert canvas.evaluate('n=>[n.width,n.height]')==dimensions
        page.set_viewport_size({'width':width,'height':height})
        if ENGINE=='chromium':
            cdp=context.new_cdp_session(page);before=page.evaluate('scrollY');page.evaluate('window.__motionWork.hero=0')
            cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':width/2,'y':height-60}]})
            for y in [height-90,height-120,height-150,height-180,height-210]:
                cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':width/2,'y':max(95,y)}]});page.wait_for_timeout(20)
            cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});page.wait_for_timeout(160)
            assert page.evaluate('scrollY')>before
            assert page.evaluate('window.__motionWork.hero')==0
        # Re-entering a scene keeps its particle identities and its own canvas.
        art.scroll_into_view_if_needed();page.wait_for_timeout(100)
        assert canvas.evaluate('n=>n.__sameMobileField') and canvas.get_attribute('data-particle-count')==count
        passed(f'{width}px: browser-height changes and scroll re-entry retain field identity and resolution without rebuilding dots')

        scene=page.locator('.landing-catalog-scene');expect(scene).to_have_attribute('data-scroll-mode','flow')
        assert scene.evaluate('n=>getComputedStyle(n.firstElementChild).position')=='static'
        snapshots=[]
        for value in [0,.5,1,.5]:
            progress(page,'.landing-catalog-scene',value)
            snapshots.append(page.locator('[data-scroll-value]').all_text_contents())
        assert snapshots[0]!=snapshots[1]!=snapshots[2] and snapshots[1]==snapshots[3],snapshots
        page.get_by_role('button',name='Show all totals',exact=True).tap()
        complete=page.locator('[data-scroll-value]').all_text_contents();progress(page,'.landing-catalog-scene',.65)
        assert page.locator('[data-scroll-value]').all_text_contents()==complete
        expect(page.locator('.landing-skills-scene')).to_have_attribute('data-scroll-mode','flow')
        for value in [0,.5,1]:
            progress(page,'.landing-skills-scene',value)
            assert page.locator('.landing-skill-node[data-connected="true"]').count()==[0,1,3][[0,.5,1].index(value)]
        page.get_by_role('group',name='Explore connected skills').get_by_role('button',name='Percentages',exact=True).tap()
        progress(page,'.landing-skills-scene',.9)
        expect(page.get_by_role('button',name='Try the percentages lesson',exact=True)).to_be_attached()
        assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
        page.screenshot(path=str(OUTPUT/f'mobile-motion-{ENGINE}-{width}.png'))
        passed(f'{width}px: reversible scroll counters and skill connections animate without pinning; explicit totals and lesson choices remain selected')
        page.emulate_media(reduced_motion='reduce');page.wait_for_timeout(100)
        expect(scene).to_have_attribute('data-scroll-mode','static')
        expect(page.locator('.landing-particle-effects')).to_have_attribute('data-motion','reduced')
        art.scroll_into_view_if_needed();page.wait_for_timeout(120);before=canvas.get_attribute('data-paint-count');image=canvas.evaluate('n=>n.toDataURL()');page.wait_for_timeout(120)
        assert canvas.get_attribute('data-paint-count')==before and canvas.evaluate('n=>n.toDataURL()')==image
        passed(f'{width}px: reduced motion shows complete static forms and stops idle animation work')
        context.close()
    assert not errors,errors
    browser.close()
print(f'{checks} mobile motion checks passed in {ENGINE}.',flush=True)
