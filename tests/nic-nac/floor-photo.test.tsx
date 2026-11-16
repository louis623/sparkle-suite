// @vitest-environment jsdom
import React,{act} from 'react'
import {createRoot} from 'react-dom/client'
import {it,expect,vi} from 'vitest'
import {FloorPhoto} from '@/app/nic-nac/components/dance-floor/FloorPhoto'
it('shows sparkle for missing, failed and pre-hydration failures, and rechecks a changed URL',async()=>{
 vi.stubGlobal('React',React);vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true)
 const host=document.createElement('div'),root=createRoot(host);document.body.append(host)
 const complete=vi.spyOn(HTMLImageElement.prototype,'complete','get').mockReturnValue(false)
 const width=vi.spyOn(HTMLImageElement.prototype,'naturalWidth','get').mockReturnValue(0)
 try{
  await act(async()=>root.render(<FloorPhoto alt="Dancer"/>));expect(host.textContent).toBe('✨');expect(host.textContent).not.toContain('No photo')
  await act(async()=>root.render(<FloorPhoto photoUrl="/first" alt="Dancer"/>));expect(host.querySelector('img')).not.toBeNull()
  await act(async()=>host.querySelector('img')!.dispatchEvent(new Event('error')));expect(host.querySelector('img')).toBeNull()
  complete.mockReturnValue(true)
  await act(async()=>root.render(<FloorPhoto photoUrl="/second" alt="Dancer"/>));expect(host.querySelector('img')).toBeNull()
  complete.mockReturnValue(false)
  await act(async()=>root.render(<FloorPhoto photoUrl="/third" alt="Dancer"/>));expect(host.querySelector('img')!.getAttribute('src')).toBe('/third')
 }finally{await act(async()=>root.unmount());host.remove();complete.mockRestore();width.mockRestore();vi.unstubAllGlobals()}
})
