import {test,expect} from '@playwright/test'
import {signInToReadyDashboard} from './helpers/dashboard'
test('narrow descriptive filters remain within the viewport',async({page})=>{
 test.setTimeout(150000); await signInToReadyDashboard(page);await page.setViewportSize({width:375,height:812});
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
 for(const id of ['analysisScopeSelect','descriptivePeriodSelect','chartGranularitySelect']) {
   const control=page.locator('#'+id);await expect(control).toBeVisible();const box=await control.boundingBox();expect(box!.x+box!.width).toBeLessThanOrEqual(375);
 }
})
