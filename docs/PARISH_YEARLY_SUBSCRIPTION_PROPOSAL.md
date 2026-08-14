# BCL Diocese ERP & Parish Mobile App
## Annual Subscription Proposal

---

**Prepared for:**  
Rev. Fr. _____________________________  
Parish Priest  
Sacred Heart Shrine Parish, Tura  
Roman Catholic Diocese of Tura, Meghalaya  

**Prepared by:**  
**BaseCode Labs Pvt. Ltd.**  
BCL Enterprise Suite — Diocese ERP Division  
Email: contact@basecodelabs.com · Web: https://basecodelabs.com  

**Proposal Date:** August 2026  
**Valid Until:** 31 October 2026  
**Proposal Reference:** BCL-DERP-2026-SHPTURA  

---

## 1. Executive Summary

BaseCode Labs presents **BCL Diocese ERP** — a complete digital platform for Catholic parish administration — together with the **BCL Parish Mobile App** for parishioners, families, and clergy.

This proposal covers **yearly subscription pricing**, full feature scope, mobile app deliverables, onboarding, support, and terms suitable for parish council and priest approval.

The platform is already architected and deployed for the **Roman Catholic Diocese of Tura**, with **Sacred Heart Shrine Parish** as the reference parish implementation (`sacredheartshrinetura.in`).

**What the parish receives in one subscription:**

| Channel | Purpose |
|---------|---------|
| **Web ERP** | Sacramental registers, families, finance, mass scheduling, cemetery, catechism, reports |
| **Parish Website (CMS)** | Public website with news, events, gallery, mass timings, forms, hero slider |
| **Mobile App (Android & iOS)** | Parishioner engagement + priest/staff pastoral tools on phone & tablet |
| **Cloud Hosting & Security** | Secure hosting, backups, SSL, domain support, updates |

---

## 2. About BaseCode Labs

**BaseCode Labs Pvt. Ltd.** builds enterprise software for institutions. The **BCL Enterprise Suite** includes Diocese ERP as its Catholic pastoral vertical — designed specifically for:

- Sacramental record-keeping (Baptism, Confirmation, Marriage, Communion, Death)
- Multi-parish diocese governance
- Parish websites and mobile engagement
- Indian diocese needs (multilingual support: English, Garo, Tamil — extensible)

**Product tagline (Mobile App):** *Faith. Community. Service.*

---

## 3. Solution Overview

### 3.1 Three pillars — one parish subscription

```
┌─────────────────────────────────────────────────────────────────┐
│                    BCL PARISH DIGITAL SUITE                      │
├─────────────────┬─────────────────────┬───────────────────────────┤
│   WEB ERP       │   PARISH WEBSITE    │   BCL PARISH MOBILE APP   │
│   (Admin)       │   (CMS — Public)    │   (Android + iOS)         │
├─────────────────┼─────────────────────┼───────────────────────────┤
│ Priest & staff  │ Parishioners &      │ Everyone — role-based     │
│ office use      │ visitors online     │ experience on mobile      │
└─────────────────┴─────────────────────┴───────────────────────────┘
                              │
                    Single secure cloud API
                    (api.turadiocese.in model)
```

### 3.2 Who uses what?

| User | Web ERP | Website | Mobile App |
|------|---------|---------|------------|
| Parish Priest | ✓ Full admin | ✓ CMS editor | ✓ Priest dashboard, registers on-the-go |
| Parish Secretary / Office Staff | ✓ Registers, families, finance | ✓ Content updates | ✓ Staff modules |
| Catechist / Coordinators | ✓ Classes, attendance | — | ✓ Limited staff access |
| Family Head / Member | ✓ (optional portal) | ✓ Public pages | ✓ Family, certificates, prayer |
| Parishioner / Guest | — | ✓ Mass times, news | ✓ Gospel, events, live mass link |
| Diocese Admin / Bishop | ✓ Cross-parish view | ✓ Diocese site | ✓ Diocese overview |

---

## 4. Detailed Feature Scope

### 4.1 Sacramental & Parish Registry (Core ERP)

| Module | Features Included |
|--------|-------------------|
| **Family Register** | Family cards, member profiles, family tree, QR family verification, print family book |
| **Baptism Register** | Digital register book, certificate generation, QR authenticity verification |
| **Confirmation Register** | Multi-step registration wizard, auto serial numbering, Excel import, analytics |
| **Marriage Register** | Marriage wizard, register pages, certificate issue & verify |
| **Holy Communion Register** | Register, certificates, parish-scoped records |
| **Death Register** | Burial records linked to cemetery module |
| **Certificate Verification** | Public QR verify page — authenticity without exposing private data |

### 4.2 Parish Operations

| Module | Features Included |
|--------|-------------------|
| **Mass Scheduling** | Daily/weekly mass timetable, intentions, bookings, status workflow |
| **Donations & Receipts** | Donation recording, receipt generation |
| **Parish Finance** | Chart of accounts, transactions, budgets |
| **Cemetery Management** | Plots, burials, records |
| **Catechism** | Classes, enrolment, attendance |
| **Hall Booking** | Parish hall / facility booking |
| **Accommodation** *(Premium)* | Guest house / shrine rooms — rent, maintenance, occupant notices |
| **Calendar & Events** | Parish calendar synced to website & mobile |
| **Communications** | SMS, WhatsApp, email campaign stubs (gateway fees extra) |

### 4.3 Parish Website (CMS)

| Feature | Description |
|---------|-------------|
| **Homepage Builder** | Drag-and-drop sections, hero banner **multi-image slider** |
| **Pages & News** | About, history, announcements, feast news |
| **Events & Gallery** | Photo albums, event listings |
| **Mass Timings** | Editable schedule on website |
| **Forms** | Prayer requests, contact, custom forms |
| **Menus & SEO** | Navigation, meta tags, sitemap |
| **Theme & Branding** | Parish colours, logo, premium Sacred Heart theme |
| **Custom Domain** | e.g. `sacredheartshrinetura.in` |
| **Multilingual** | English + Garo (extensible) |

### 4.4 Diocese Integration *(when under Diocese plan)*

- Parish auto-provisioning from diocese admin
- Deanery & priest directory
- Cross-parish analytics for bishop / diocese admin
- Central API and media CDN
- Subdomain per parish (`{parish}.turadiocese.in`)

### 4.5 Security & Compliance

- Role-based access control (19+ roles: Priest, Secretary, Catechist, Family Head, etc.)
- Parish data isolation — each parish sees only its own records
- JWT authentication, session management, optional 2FA
- Audit log of administrative actions
- Encrypted connections (HTTPS/SSL)
- Regular database backups

### 4.6 Data Migration & Training

- Excel import templates for legacy registers (Baptism, Marriage, Confirmation, Families, etc.)
- Onboarding assistance for priest and secretary
- Video / document user guides

---

## 5. BCL Parish Mobile App — Detailed Specification

**App Name:** BCL Parish App  
**Platforms:** Android (primary) · iOS · Tablet-optimised  
**Package:** `com.basecodelabs.parish`  
**Backend:** Live connection to parish ERP API (same data as web)

### 5.1 Mobile app — Parishioner & family features

| Feature | Description |
|---------|-------------|
| **Parish Selection** | Select diocese → parish on first launch |
| **Daily Gospel & Feast** | Today’s readings, gospel quote, feast of the day |
| **Mass Timings** | Full weekly schedule with language labels |
| **Events & News** | Parish announcements and feast news |
| **Photo Gallery** | Parish life photos from CMS |
| **Live Mass Link** | Quick access to live stream (when configured) |
| **Prayer Requests** | Submit prayer intentions via mobile form |
| **Donations** | Donation information and links |
| **Certificate Wallet** | View family sacramental certificates |
| **QR Verify** | Scan certificate QR to verify authenticity |
| **Push Notifications** | Feast alerts, announcements, mass reminders |
| **Offline Cache** | Gospel, mass times, announcements available offline |
| **Guest Mode** | Browse public content without login |
| **Biometric Login** | Fingerprint / Face ID for returning users |

### 5.2 Mobile app — Parish Priest & staff features

| Feature | Description |
|---------|-------------|
| **Priest Dashboard** | KPI cards — families, baptisms, confirmations, upcoming masses |
| **Sacrament Registers** | Baptism, Confirmation, Marriage, Communion, Death — view & manage on mobile |
| **Families & Members** | Search and view parish family directory |
| **Mass Schedule** | View and manage today’s masses |
| **Approvals Queue** | Pending items requiring priest action |
| **Finance Summary** | Key financial overview (role-permitted) |
| **Donations** | Record and view donations |
| **Catechism** | Class lists and attendance |
| **CMS Quick Access** | Link to manage website content |
| **Communications** | Send announcements (with diocese push centre) |
| **Reports** | Parish summary reports |
| **AI Assistant** *(Premium)* | Pastoral search across parish records |
| **Accommodation** *(Premium)* | Room status, rent, maintenance, notices |

### 5.3 Mobile app — Diocese admin features

| Feature | Description |
|---------|-------------|
| **Diocese Overview** | All parishes at a glance |
| **Priest Directory** | Diocese clergy listing |
| **Cross-parish Analytics** | Aggregate statistics |
| **App Control Centre** | Push notification composer, mobile CMS flags |
| **License Management** | View subscription seats and plan |

### 5.4 Mobile app — Technical deliverables (included in subscription)

| Deliverable | Details |
|-------------|---------|
| **Branded APK** | Parish/diocese branded Android app |
| **Google Play Publishing** | BaseCode Labs assists with Play Store listing *(one-time setup fee may apply)* |
| **iOS App** | TestFlight / App Store build *(Standard & Premium plans)* |
| **Push Notification Service** | Expo push integration with parish announcement pipeline |
| **App Updates** | Security patches and feature updates during subscription period |
| **API Integration** | Connected to parish ERP — no separate mobile database |

### 5.5 Mobile app — User experience

- Premium burgundy & gold Catholic design theme
- Bottom navigation: Home · Directory · Calendar · Alerts · Profile
- Role-aware home screen (different view for priest vs parishioner)
- Tablet sidebar layout for office use on iPad / Android tablet
- Secure token storage (SecureStore) with automatic session refresh

---

## 6. Yearly Subscription Plans

*All prices in Indian Rupees (₹). Exclusive of GST @ 18%.*

### 6.1 Parish Plans *(single parish)*

#### **Plan A — Parish Essentials** · ₹59,000 / year

Best for: Parishes starting digital records and basic website.

| Included | |
|----------|---|
| Web ERP | Family register + all 5 sacramental registers |
| Certificates | Digital issue + QR verification |
| Mass scheduling | Timetable & intentions |
| Basic finance & donations | |
| Parish website (CMS) | Standard theme, 5 pages, news, events, gallery |
| Staff seats | Up to **3** users (Priest + 2 staff) |
| Storage | 5 GB media |
| Support | Email support · 48-hour response |
| Mobile App | ✗ Not included |

---

#### **Plan B — Parish Complete** · ₹1,29,000 / year ⭐ *Recommended*

Best for: Active parishes wanting full ERP, website, and mobile engagement.

| Included | |
|----------|---|
| Everything in Plan A | |
| **BCL Parish Mobile App** | Android + iOS for parishioners & staff |
| Push notifications | Feast, announcements, mass reminders |
| Premium website theme | Sacred Heart / custom parish branding |
| Hero slider, forms, SEO | Full CMS |
| Staff seats | Up to **10** users |
| Storage | 20 GB media |
| Excel data import | Legacy register migration assistance |
| Support | Priority email + WhatsApp · 24-hour response |
| Training | 2 online training sessions (priest + secretary) |

---

#### **Plan C — Parish Premium** · ₹1,89,000 / year

Best for: Shrine parishes, pilgrimage centres, or parishes with guest house.

| Included | |
|----------|---|
| Everything in Plan B | |
| **Accommodation module** | Guest house / shrine rooms on web + mobile |
| **AI Assistant** | Intelligent search across parish records |
| **OCR Register Digitization** | Scan & import historical register pages |
| **App Control Centre** | Advanced push campaigns & scheduling |
| Custom domain setup | Full DNS + SSL management |
| Staff seats | Up to **25** users |
| Storage | 50 GB media |
| Support | Priority phone + WhatsApp · 12-hour response |
| Training | 4 sessions + on-site visit *(within Meghalaya)* |

---

### 6.2 Diocese Plans *(multi-parish — for Diocese Office)*

#### **Diocese Platform — Starter** · ₹4,99,000 / year

| Included | |
|----------|---|
| Diocese admin ERP | Bishop / Vicar General dashboard |
| Up to **15 parishes** included | Each with Plan B equivalent |
| Central API & hosting | `erp.{diocese}.in` model |
| Diocese public website | |
| Mobile app | Diocese-wide app with parish picker |
| Additional parish | ₹29,000 / parish / year |
| Support | Dedicated account manager |

#### **Diocese Platform — Enterprise** · Custom pricing

- Unlimited parishes, custom SLA, on-premise option, white-label mobile app.
- Contact BaseCode Labs for quotation.

---

### 6.3 Add-on Services *(optional, yearly or one-time)*

| Add-on | Price | Notes |
|--------|-------|-------|
| **Extra staff seats** (per 5 users) | ₹6,000 / year | Beyond plan limit |
| **Extra storage** (per 10 GB) | ₹3,000 / year | Photos, documents |
| **SMS gateway credits** | At cost + 10% | Transactional SMS |
| **WhatsApp Business API** | At cost + 10% | Announcement broadcasts |
| **Google Play Store listing** | ₹15,000 one-time | Developer account + listing |
| **Apple App Store listing** | ₹25,000 one-time | Apple Developer + listing |
| **On-site training day** | ₹12,000 / day | Travel outside Meghalaya extra |
| **Historical register digitization** | ₹500 / register page | Manual OCR + verification |
| **Custom website design** | From ₹35,000 | Bespoke theme beyond standard |

---

### 6.4 One-Time Onboarding Fee

| Item | Price |
|------|-------|
| **Parish onboarding & setup** | ₹25,000 *(waived for Plan C and Diocese plans)* |
| Includes | Server provisioning, parish creation, CMS setup, domain connection, 1 staff account setup, initial data import (up to 500 records) |

---

## 7. Pricing Summary Table

| Plan | Yearly Fee (₹) | Mobile App | Best For |
|------|----------------|------------|----------|
| **A — Essentials** | 59,000 | No | Records + basic website |
| **B — Complete** ⭐ | 1,29,000 | Yes | Full digital parish |
| **C — Premium** | 1,89,000 | Yes + advanced | Shrine / guest house |
| **Diocese Starter** | 4,99,000 | Yes (all parishes) | Diocese office (15 parishes) |

*GST @ 18% applicable on all fees.*

**Recommended for Sacred Heart Shrine Parish:** **Plan B — Parish Complete** at **₹1,29,000 + GST per year**  
*(₹1,52,220 incl. GST)*

---

## 8. Payment Terms

| Term | Details |
|------|---------|
| **Billing cycle** | Annual (preferred) · Quarterly available at +8% |
| **Payment method** | Bank transfer (NEFT/RTGS/IMPS) · UPI · Cheque |
| **Invoice** | GST invoice from BaseCode Labs Pvt. Ltd. |
| **Due date** | Within 15 days of invoice / before service activation |
| **Renewal** | Auto-renewal reminder 30 days before expiry |
| **Late renewal** | 15-day grace period; read-only access after grace period |

### Illustrative payment schedule (Plan B — Quarterly option)

| Quarter | Amount (excl. GST) |
|---------|-------------------|
| Q1 (Apr–Jun) | ₹34,920 |
| Q2 (Jul–Sep) | ₹34,920 |
| Q3 (Oct–Dec) | ₹34,920 |
| Q4 (Jan–Mar) | ₹34,920 |
| **Total** | **₹1,39,680** (+8% vs annual) |

---

## 9. Implementation Timeline

| Phase | Duration | Activities |
|-------|----------|------------|
| **Phase 1 — Setup** | Week 1–2 | Server access, parish provisioning, domain & SSL, admin accounts |
| **Phase 2 — Data** | Week 2–4 | Legacy register import, family data, mass timetable, priest profile |
| **Phase 3 — Website** | Week 3–4 | CMS content, hero images, news, gallery, forms |
| **Phase 4 — Mobile App** | Week 4–6 | Branded build, push setup, Play Store / TestFlight, parishioner rollout |
| **Phase 5 — Go Live** | Week 6 | Training, handover, support channel activation |

**Total estimated go-live:** 6 weeks from signed agreement and first payment.

---

## 10. Support & Service Level

| Plan | Support Channel | Response Time | Uptime Target |
|------|-----------------|---------------|---------------|
| A — Essentials | Email | 48 hours | 99.0% |
| B — Complete | Email + WhatsApp | 24 hours | 99.5% |
| C — Premium | Phone + WhatsApp | 12 hours | 99.9% |
| Diocese | Dedicated manager | 8 hours | 99.9% |

**Included in all plans:**
- Software updates and security patches
- Daily automated database backups (30-day retention)
- SSL certificate renewal
- Bug fixes for licensed modules

**Not included:**
- Third-party gateway fees (SMS, payment gateway)
- Hardware (computers, printers, scanners)
- Internet connectivity at parish office

---

## 11. Why Choose BCL Diocese ERP?

1. **Built for Catholic parishes** — not a generic CRM adapted for churches  
2. **Sacramental registers with legal-style serial numbering** — Confirmation, Baptism, etc.  
3. **QR certificate verification** — parishioners can prove authenticity instantly  
4. **One platform** — ERP + website + mobile; no juggling multiple vendors  
5. **Already deployed for Diocese of Tura** — proven architecture, not a prototype  
6. **Multilingual** — English & Garo for Meghalaya parishes  
7. **Parish data stays isolated** — secure tenancy; only your parish sees your records  
8. **Mobile-first for parishioners** — gospel, mass, events in their pocket  
9. **Priest on-the-go** — view registers and approvals from phone  
10. **Indian company** — local support, GST invoice, rupee billing  

---

## 12. Terms & Conditions (Summary)

1. Subscription is for a **12-month term** from activation date.  
2. Data remains property of the parish; export available on request.  
3. BaseCode Labs retains ownership of software; parish receives a **non-exclusive license** for the subscription period.  
4. Either party may terminate with **60 days written notice** before renewal.  
5. On termination, parish receives full data export (JSON/Excel); hosting ends after export window.  
6. BaseCode Labs is not liable for indirect losses; liability capped at fees paid in the preceding 12 months.  
7. Parish responsible for accuracy of entered sacramental data.  
8. Full Master Service Agreement (MSA) available on request.  

---

## 13. Acceptance

We recommend **Plan B — Parish Complete (₹1,29,000/year + GST)** including the **BCL Parish Mobile App** for Sacred Heart Shrine Parish.

| | |
|---|---|
| **Selected Plan** | ☐ Plan A · ☐ Plan B · ☐ Plan C · ☐ Diocese · ☐ Custom |
| **Onboarding fee** | ☐ Standard ₹25,000 · ☐ Waived (Plan C) |
| **Billing** | ☐ Annual · ☐ Quarterly |
| **Mobile platforms** | ☐ Android · ☐ Android + iOS |

**For Parish Approval:**

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Parish Priest | | | |
| Parish Council / Finance Rep. | | | |
| Diocese Representative *(if required)* | | | |

**For BaseCode Labs Pvt. Ltd.:**

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Authorised Signatory | | | |
| Project Manager | | | |

---

## 14. Contact

**BaseCode Labs Pvt. Ltd.**  
Website: https://basecodelabs.com  
Email: contact@basecodelabs.com  
Product: BCL Enterprise Suite — Diocese ERP  

*This proposal is confidential and prepared exclusively for the addressee parish.*

---

*Document version 1.0 · August 2026 · © BaseCode Labs Pvt. Ltd.*

---

## Printable PDF

A print-ready PDF version is available at:

**`docs/proposal/PARISH_YEARLY_SUBSCRIPTION_PROPOSAL.pdf`**

To regenerate after editing the HTML source:

```bash
node docs/proposal/generate-pdf.mjs
```

Source design file: `docs/proposal/parish-subscription-proposal.html`
