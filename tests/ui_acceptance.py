#!/usr/bin/env python3
"""Browser-level acceptance tests for public Hưng Yên Jobs and isolated admin UI.

Public checks use the deployed GitHub Pages and actual public Supabase reads.
Admin checks mock the authentication/data adapter in the browser (NO real credentials,
NO DB mutations); real admin RLS is checked separately by Supabase SQL.
"""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = os.environ.get("HYJOBS_URL", "https://infiniti-money.github.io/Web-tuyen-dung/app.html")
JOB = "6b11db28-62f5-48f3-91d7-404a356cf31d"
COMPANY = "2ee1ec80-0d62-4f4a-822c-efb6f5c8af07"
TITLE = "[TEST] Nhân viên kho Hưng Yên"
ORG = "CTY KIỂM THỬ HƯNG YÊN"
ARTIFACTS = Path(os.environ.get("UI_ARTIFACT_DIR", "qa-browser-artifacts"))
ARTIFACTS.mkdir(parents=True, exist_ok=True)
results = []

# This mock is used *only* for testing the visual Admin interface.
# It must not be deployed or used to claim that real Admin login succeeded.
ADMIN_MOCK = r"""
const ADMIN = '6de4092d-e022-4295-8ec9-1abe37978b2b';
const COMPANY = '2ee1ec80-0d62-4f4a-822c-efb6f5c8af07';
const testCompany = {id:COMPANY, owner_id:'fake-owner',name:'CTY KIỂM THỬ HƯNG YÊN',
  status:'approved',location:'Hưng Yên',created_at:'2026-10-31T00:00:00Z'};
const jobs = [
 {id:'6b11db28-62f5-48f3-91d7-404a356cf31d',title:'[TEST] Nhân viên kho Hưng Yên',
  status:'published',location:'Mỹ Hào, Hưng Yên',company_id:COMPANY,
  companies:{name:testCompany.name,status:'approved'},created_at:'2026-10-31T00:00:00Z'},
 {id:'d20ab8d3-416c-42e2-8174-1431a7fbd6c4',title:'nhân viên kho',
  status:'closed',location:'Hưng Yên',company_id:COMPANY,
  companies:{name:testCompany.name,status:'approved'},created_at:'2026-10-31T01:00:00Z'},
];
const source={profiles:[{id:ADMIN,role:'admin',full_name:'QA Admin'}],
  companies:[testCompany],jobs};
class Query {
 constructor(table){this.table=table;this.conditions=[];this.max=1000;}
 select(){return this;}
 eq(field,value){this.conditions.push([field,value]);return this;}
 order(){return this;}
 limit(max){this.max=max;return this;}
 _items(){return (source[this.table]||[]).filter(row=>this.conditions.every(([key,value])=>
   row[key]===value)).slice(0,this.max);}
 then(resolve,reject){return Promise.resolve({data:this._items(),error:null}).then(resolve,reject);}
 single(){const data=this._items()[0];return Promise.resolve({data:data||null,
   error:data?null:{message:'not found'}});}
 maybeSingle(){return Promise.resolve({data:this._items()[0]||null,error:null});}
}
export function createClient(){
  return {
    auth:{getUser:async()=>({data:{user:{id:ADMIN,email:'qa-admin@example.invalid'}}})},
    from:(table)=>new Query(table),
    rpc:async()=>({data:[],error:null})
  };
}
"""

def check(name, callback):
    try:
        callback()
        results.append({"check": name, "status": "PASS"})
        print("PASS", name, flush=True)
    except Exception as exc:
        results.append({"check": name, "status": "FAIL", "error": str(exc)})
        print("FAIL", name, str(exc), flush=True)
        raise

def wait_ready(page, selector):
    page.locator(selector).first.wait_for(state="visible", timeout=45000)

def no_horizontal_overflow(page):
    dims = page.evaluate("""() => ({
        viewport:window.innerWidth,
        document:document.documentElement.scrollWidth,
        body:document.body.scrollWidth
    })""")
    assert dims["document"] <= dims["viewport"] + 3, f"Horizontal overflow: {dims}"

def test_mobile_filters(browser, width, height):
    context = browser.new_context(viewport={"width":width,"height":height},
        device_scale_factor=1,is_mobile=True,has_touch=True)
    page = context.new_page()
    try:
        page.goto(BASE + "#jobs", wait_until="domcontentloaded", timeout=65000)
        wait_ready(page, "#list .job")
        assert TITLE in page.locator("#list").inner_text()
        assert page.locator("#resultCount").inner_text().strip() == "1"
        no_horizontal_overflow(page)
        # Real dropdown interactions on mobile viewport
        page.locator("#industry").select_option(label="Kho vận")
        assert page.locator("#resultCount").inner_text().strip() == "1"
        page.locator("#region").select_option(label="Mỹ Hào, Hưng Yên")
        assert page.locator("#resultCount").inner_text().strip() == "1"
        page.locator("#salary").select_option("ge25")
        assert page.locator("#resultCount").inner_text().strip() == "0"
        page.locator("#salary").select_option("10to15")
        assert page.locator("#resultCount").inner_text().strip() == "1"
        page.locator("#search").fill("cong-viec-chac-chan-khong-co-qa-999")
        assert page.locator("#resultCount").inner_text().strip() == "0"
        page.locator("#clearFilters").click()
        assert page.locator("#resultCount").inner_text().strip() == "1"
        page.locator("#sort").select_option("salarydesc")
        assert TITLE in page.locator("#list").inner_text()
        no_horizontal_overflow(page)
        page.screenshot(path=str(ARTIFACTS / f"mobile-filters-{width}.png"),full_page=True)
    finally:
        context.close()

def test_public_detail(browser):
    context=browser.new_context(viewport={"width":390,"height":844},is_mobile=True,
                                device_scale_factor=1,has_touch=True)
    page=context.new_page()
    errors=[]
    page.on("pageerror", lambda ex: errors.append(str(ex)))
    try:
        # Deep link must load directly, not only after coming from the listing page.
        page.goto(BASE+"#job/"+JOB,wait_until="domcontentloaded",timeout=65000)
        wait_ready(page,".detail-primary h1")
        assert TITLE in page.locator(".detail-primary h1").inner_text()
        assert ORG in page.locator(".detail-company").inner_text()
        assert page.get_by_role("button",name="Ứng tuyển ngay").is_visible()
        no_horizontal_overflow(page)
        page.screenshot(path=str(ARTIFACTS/"job-detail-mobile.png"),full_page=True)
        # Use the real on-screen company link.
        page.locator(".detail-company a").click()
        try:
            page.locator(".company-profile-hero h1").wait_for(state="visible",timeout=12000)
        except Exception:
            print("DEBUG company navigation:",page.url,flush=True)
            print("DEBUG company root:",page.locator("#root").inner_text()[:1400],flush=True)
            print("DEBUG runtime errors:",errors,flush=True)
            page.screenshot(path=str(ARTIFACTS/"company-navigation-debug.png"),full_page=True)
            raise
        assert ORG in page.locator(".company-profile-hero h1").inner_text()
        assert TITLE in page.locator(".company-job-grid").inner_text()
        assert page.locator("#viewCompanyJobs").is_visible()
        no_horizontal_overflow(page)
        page.screenshot(path=str(ARTIFACTS/"company-profile-mobile.png"),full_page=True)
        # Opening a company deep link in a new page must also succeed.
        page.goto(BASE+"#company/"+COMPANY,wait_until="domcontentloaded",timeout=65000)
        wait_ready(page,".company-profile-hero h1")
        assert ORG in page.locator(".company-profile-hero h1").inner_text()
    finally:
        context.close()

def test_invalid_detail(browser):
    page=browser.new_page(viewport={"width":390,"height":844})
    try:
        page.goto(BASE+"#job/00000000-0000-4000-8000-000000000000",
                  wait_until="domcontentloaded",timeout=65000)
        wait_ready(page,".empty-state")
        assert "không còn được công khai" in page.locator(".empty-state").inner_text().lower()
        assert page.locator(".detail-primary").count()==0
    finally:page.close()

def test_admin_visual_mock(browser):
    context=browser.new_context(viewport={"width":390,"height":844},
                                is_mobile=True,has_touch=True)
    async_errors=[]
    page=context.new_page()
    page.on("pageerror",lambda e:async_errors.append(str(e)))
    page.route("**/esm.sh/@supabase/supabase-js@2.75.0*",
       lambda route:route.fulfill(status=200,content_type="text/javascript",
          headers={"access-control-allow-origin":"*"},body=ADMIN_MOCK))
    try:
        page.goto(BASE+"?qa_admin=1#dashboard",wait_until="domcontentloaded",timeout=65000)
        wait_ready(page,"#adminJobCount")
        assert page.locator("#adminJobCount").inner_text().strip()=="0 tin tuyển dụng"
        page.locator("#jobFilter").select_option("published")
        assert page.locator("#adminJobCount").inner_text().strip()=="1 tin tuyển dụng"
        assert TITLE in page.locator("#adminJobs").inner_text()
        page.locator("#jobFilter").select_option("closed")
        assert page.locator("#adminJobCount").inner_text().strip()=="1 tin tuyển dụng"
        assert "nhân viên kho" in page.locator("#adminJobs").inner_text().lower()
        page.locator("#adminSearch").fill("cong-ty-khong-co-qa-999")
        assert page.locator("#adminJobCount").inner_text().strip()=="0 tin tuyển dụng"
        page.locator("#adminSearch").fill("")
        page.locator("#companyFilter").select_option("approved")
        assert page.locator("#adminCompanyCount").inner_text().strip()=="1 doanh nghiệp"
        assert "CTY KIỂM THỬ HƯNG YÊN" in page.locator("#adminCompanies").inner_text()
        page.locator("#jobFilter").select_option("pending")
        no_horizontal_overflow(page)
        page.screenshot(path=str(ARTIFACTS/"admin-filters-mocked-mobile.png"),full_page=True)
        assert not async_errors, async_errors
    finally:context.close()

# Separate isolated employer scenario; uses synthetic data, no real credentials or writes.
EMPLOYER_MOCK = (ADMIN_MOCK
    .replace("owner_id:'fake-owner'", "owner_id:ADMIN")
    .replace("role:'admin'", "role:'employer'")
    .replace("rpc:async()=>({data:[],error:null})", """rpc:async()=>({data:[{
      id:'fe100000-0000-4000-8000-000000000056',
      job_id:'6b11db28-62f5-48f3-91d7-404a356cf31d',
      full_name:'Ứng viên thử nghiệm',status:'reviewing',
      cover_letter:'Hồ sơ mô phỏng kiểm thử bộ lọc',cv_path:null
    }],error:null})"""))

def test_saved_jobs_mobile(browser):
    context=browser.new_context(viewport={"width":390,"height":844},is_mobile=True,
                                has_touch=True,device_scale_factor=1)
    page=context.new_page()
    try:
        page.goto(BASE+"#jobs",wait_until="domcontentloaded",timeout=65000)
        wait_ready(page,"#list [data-save]")
        page.locator("#list [data-save]").first.click()
        assert page.locator("#savedCounter").inner_text()=="1"
        assert page.locator("#savedSummary").inner_text()=="1"
        page.locator('a[href="#saved"]').first.click()
        wait_ready(page,"#savedList .job")
        assert TITLE in page.locator("#savedList").inner_text()
        page.reload(wait_until="domcontentloaded")
        wait_ready(page,"#savedList .job")
        assert TITLE in page.locator("#savedList").inner_text()
        assert page.locator("#savedCounter").inner_text()=="1"
        page.locator('#savedList [data-save]').first.click()
        wait_ready(page,'.empty-state')
        assert page.locator("#savedCounter").inner_text()=="0"
        no_horizontal_overflow(page)
        page.screenshot(path=str(ARTIFACTS/"saved-jobs-mobile.png"),full_page=True)
    finally:context.close()

def test_employer_review_filters_mock(browser):
    context=browser.new_context(viewport={"width":390,"height":844},
                                is_mobile=True,has_touch=True)
    page=context.new_page()
    errors=[]
    page.on("pageerror",lambda ex:errors.append(str(ex)))
    page.route("**/esm.sh/@supabase/supabase-js@2.75.0*",
      lambda route:route.fulfill(status=200,content_type="text/javascript",
        headers={"access-control-allow-origin":"*"},body=EMPLOYER_MOCK))
    try:
        page.goto(BASE+"?qa_recruiter=1#dashboard",wait_until="domcontentloaded",timeout=65000)
        wait_ready(page,"#applicantSearch")
        assert page.locator("#applicantCount").inner_text()=="1 / 1 hồ sơ"
        page.locator("#applicantFilter").select_option("submitted")
        assert page.locator("#applicantCount").inner_text()=="0 / 1 hồ sơ"
        page.locator("#applicantFilter").select_option("reviewing")
        assert page.locator("#applicantCount").inner_text()=="1 / 1 hồ sơ"
        page.locator("#applicantSearch").fill("ho-so-khong-ton-tai")
        assert page.locator("#applicantCount").inner_text()=="0 / 1 hồ sơ"
        page.locator("#applicantSearch").fill("")
        assert page.locator("#applicantCount").inner_text()=="1 / 1 hồ sơ"
        no_horizontal_overflow(page)
        page.screenshot(path=str(ARTIFACTS/"employer-applicant-filters-mobile.png"),full_page=True)
        assert not errors,errors
    finally:context.close()


# Isolated candidate render checks: Supabase client is mocked; no real personal data.
CANDIDATE_MOCK = ADMIN_MOCK.replace("role:'admin'","role:'candidate'")

def test_candidate_alert_and_cv_routes_mock(browser):
    context=browser.new_context(viewport={"width":390,"height":844},
                                is_mobile=True,has_touch=True)
    page=context.new_page()
    errors=[]
    page.on("pageerror",lambda err:errors.append(str(err)))
    page.route("**/esm.sh/@supabase/supabase-js@2.75.0*",
       lambda route:route.fulfill(status=200,content_type="text/javascript",
         headers={"access-control-allow-origin":"*"},body=CANDIDATE_MOCK))
    try:
        page.goto(BASE+"?qa_candidate=1#alerts",wait_until="domcontentloaded",timeout=65000)
        wait_ready(page,"#alertPrefsForm")
        assert page.get_by_text("Thông báo việc làm phù hợp").is_visible()
        assert page.locator("#alertKeyword").count()==1
        assert page.locator("#alertSalary").count()==1
        assert page.locator('input[name="email_opt_in"]').count()==1
        assert not page.locator('input[name="email_opt_in"]').is_checked()
        assert page.locator("#enablePush").is_disabled()  # Missing public VAPID key, fail closed
        assert page.locator("#disablePush").count()==1
        no_horizontal_overflow(page)
        page.screenshot(path=str(ARTIFACTS/"alerts-mobile-mocked.png"),full_page=True)
        page.goto(BASE+"?qa_candidate=1#cv",wait_until="domcontentloaded",timeout=65000)
        wait_ready(page,"#cvLibraryForm")
        assert page.locator("#cvLibraryInput").count()==1
        assert "CV của tôi" in page.locator("#root").inner_text()
        no_horizontal_overflow(page)
        page.screenshot(path=str(ARTIFACTS/"cv-library-mobile-mocked.png"),full_page=True)
        assert not errors,errors
    finally:context.close()


def test_privacy_rights_mobile(browser):
    # Public notice uses the actual site. Account-role views are safely mocked.
    public=browser.new_page(viewport={"width":390,"height":844})
    try:
        public.goto(BASE+"#privacy",wait_until="domcontentloaded",timeout=65000)
        wait_ready(public,".privacy-article")
        assert "xóa dữ liệu" in public.locator(".privacy-article").inner_text().lower()
        assert public.locator('a[href="#data-rights"]').count()>=1
        no_horizontal_overflow(public)
        public.screenshot(path=str(ARTIFACTS/"privacy-public-mobile.png"),full_page=True)
    finally: public.close()
    for role,stub,selector in [
        ("candidate",CANDIDATE_MOCK,"#dataRightsForm"),
        ("admin",ADMIN_MOCK,"#rightsStatusFilter")
    ]:
        context=browser.new_context(viewport={"width":390,"height":844},
                                    is_mobile=True,has_touch=True)
        page=context.new_page()
        errors=[]
        page.on("pageerror",lambda ex:errors.append(str(ex)))
        def serve_test_supabase(route):
            route.fulfill(status=200,content_type="text/javascript",
                headers={"access-control-allow-origin":"*"},body=stub)
        page.route("**/esm.sh/@supabase/supabase-js@2.75.0*",serve_test_supabase)
        try:
            page.goto(BASE+("#data-rights" if role=="candidate" else "#admin-rights"),
                      wait_until="domcontentloaded",timeout=65000)
            wait_ready(page,selector)
            if role=="candidate":
                assert page.locator("#exportMyData").is_visible()
                assert page.locator("#rightsKind").count()==1
                assert "Lịch sử yêu cầu" in page.locator("#root").inner_text()
            else:
                assert page.locator("#rightsQueueCount").inner_text().startswith("0 / 0")
                assert "xóa" in page.locator("#root").inner_text().lower()
            no_horizontal_overflow(page)
            page.screenshot(path=str(ARTIFACTS/f"privacy-{role}-mobile-mocked.png"),full_page=True)
            assert not errors,errors
        finally:context.close()

def main():
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,args=["--no-sandbox"])
        try:
            check("Mobile 390px — live public filters and sorting",
                  lambda:test_mobile_filters(browser,390,844))
            check("Mobile 360px — live filters without overflow",
                  lambda:test_mobile_filters(browser,360,780))
            check("Job/company deep links — live public pages",
                  lambda:test_public_detail(browser))
            check("Invalid unpublished job is not displayed",
                  lambda:test_invalid_detail(browser))
            check("Admin moderation filter UI — mocked authenticated admin",
                  lambda:test_admin_visual_mock(browser))
            check("Saved jobs persist across mobile reload and can be removed",
                  lambda:test_saved_jobs_mobile(browser))
            check("Employer applicant search/status filters — isolated mock",
                  lambda:test_employer_review_filters_mock(browser))
            check("Candidate CV library and job alerts — isolated account mock",
                  lambda:test_candidate_alert_and_cv_routes_mock(browser))
            check("Privacy notice, own requests, Admin review — phone viewport",
                  lambda:test_privacy_rights_mobile(browser))
        finally:
            browser.close()
    (ARTIFACTS/"results.json").write_text(
        json.dumps({"url":BASE,"result":results,
            "caveat":"Admin visual checks used a mocked account; no production login or mutation."},
            ensure_ascii=False,indent=2),encoding="utf-8")
    print("Browser acceptance checks PASS.",flush=True)

if __name__=="__main__":
    try: main()
    except Exception:
        (ARTIFACTS/"results.json").write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding="utf-8")
        raise
