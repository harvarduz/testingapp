"""Inspect the local illustration surfaces, including their text exclusion."""
def field_images(page):
    return page.locator('.landing-scene-canvas').evaluate_all('nodes=>nodes.map(node=>node.toDataURL()).join("|")')


def field_ink(page, selector):
    return page.locator(selector).first.evaluate('''node=>{
      const host=node.matches('[data-particle-effect]')?node:node.closest('[data-particle-effect]');
      const c=host?.querySelector('.landing-scene-canvas');if(!c?.width)return 0;
      const r=node.getBoundingClientRect(),box=host.getBoundingClientRect(),d=c.width/host.clientWidth;
      const x=Math.max(0,Math.ceil((r.left-box.left)*d)),y=Math.max(0,Math.ceil((r.top-box.top)*d));
      const w=Math.max(0,Math.min(c.width,Math.floor((r.right-box.left)*d))-x),h=Math.max(0,Math.min(c.height,Math.floor((r.bottom-box.top)*d))-y);
      if(!w||!h)return 0;const pixels=c.getContext('2d').getImageData(x,y,w,h).data;let ink=0;
      for(let i=3;i<pixels.length;i+=4)if(pixels[i]>24)ink++;return ink;
    }''')
