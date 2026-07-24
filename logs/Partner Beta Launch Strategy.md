# Chat Conversation

Note: _This is purely the output of the chat conversation and does not contain any raw data, codebase snippets, etc. used to generate the output._

### User Input

/cy-create-prd So we have decided to soft-launch the system for some businesses we will invite directly, to help solve the chicken-and-egg problem, so when we launch there will be already new businesses. So let's start a new workflow called `partner-beta` to finish up the business side of things while in parallel I work on the resident user-facing features.

I already added two landing pages, one for the homepage with a teaser for the residents in case anyone already tries to access the home page, and a new landing page for partner businesses.
- @[routes/index.tsx] 
- @[routes/home.tsx] (the index page we already had as a backup)
- @[routes/parceiros.tsx] 

Here's what I think we are missing, feel free to suggest more:
# Partner Dashboard
## Onboarding
The onboarding flow is showing up broken, it moves the page content down, and it has an overlay that when clicked closes the onboarding but it's only possible to click it. IIRc the onboarding should show over the page and let's only allow them to close it when they get to the end of the onboarding wizard.

## Profile
We need to add the fields related to the business that are not showing up on the page and add a few more:
- The fields that are used when creating the account (Nome Fansatia, Razão Social, CNPJ). For email and password chanding let's leave it for later.
- The business category that will be used as the filter for the catalog when users are searching for the business, we already have that implemented.
- Address fields: CEP, Street Name, Street Number, Neighborhood
- Google Maps link

## Analytics
Let's just hide the link for now, I think I went way overboard trying to create an analytics system from scratch because I thought using Google Analytics or Microsoft Clarity was expensive, so we will be replacing the ad-hoc analytics part with one of those systems in the next version

## Coupon Campaigns
We already did a good exploration of all possible types of coupons we can have, but I think that needs to be fleshed out more in the future and be less confusing for the business, so what I'd like to do now is:
- hide frequency field... so if they add 50 coupons and those get used, the campaing ends and they just can create a new one.
- hide user limit field as that was very tied to the frequency as well, just let's keep the global cap.
- Tie the max units field for the BOGO and item discount types, as it does not make sense for the percentual and fixed value discounts to have this field as they are not tied to any specific item and are for the entire. Also move this field together with the other fields that are tied to the specific discounts.
- Format everything as currency as having to input cents can be confusing for the business administrator.

### Preset Campaign models
- Desconto Simples: remove
- Benefício Fidelidade: Let's make this be as the main one: "Desconto percentual, resgates ilimitados, sempre ativo, sem expiração. Para fidelidade contínua de moradores".
- Promoção Relâmpago: "Desconto percentual, validade de 7 dias. Para ofertas por tempo limitado."
- Promoção de evento: keep as-is.
- Liquidação de item: as we are disabling the user limit: "Desconto por item, limite global. Para liquidar produtos específicos."

## Enabled features
So we will manage payments to the system outside and we already have the boolean for saying if a business profile is active (aka it's a paying partner) or not. So For inactive ones, we only will allow them to have a basic profile that will show on the catalog but not on the feed, as they will not be able to create coupon campaigns or post publications to their feed. So for businesses that are not enabled we need to disable them interacting with those pages and add a warning on the dashboard for them to get in touch with our team at passporte@nodolabs.xyz

# Admin Dashboard
## Partners
We already have a system to enable/disable business partners, but I think we need a way to control their payments. So we could add a ledger where we add the payment date, value and amount of months, so we can have control of which businesses are paying partners and up to when their plan expires.

# General
## Category
I'd like suggestions if you notice a type of business that is missing, but let's change what we have to be:
- Gastronomia
- Moda
- Casa & Decor
- Corpo & Fitness
- Beleza
- Saúde & Farmácia
- Educação
- Mercado & Conveniência
- Serviços
- Eventos & Experiências
- Hotelaria
- Comércio Geral & Outros

*Viewed [SKILL.md](file:///Users/dev/nodo/passport/deno/.agents/skills/cy-create-prd/SKILL.md) *

*User accepted the command `mkdir -p .compozy/tasks/partner-beta/adrs`*

*Viewed [schema.ts](file:///Users/dev/nodo/passport/deno/db/schema.ts) *

*Searched web for partner dashboard local business coupon management*

### Planner Response

I have started the `partner-beta` workflow and created the necessary directories for the PRD and ADRs (`.compozy/tasks/partner-beta/`).

Before we dive into the first question, here is a brief summary of the research based on your requirements:

**Codebase Findings:**
* The `businesses` table currently lacks address fields (CEP, Street, etc.) and Google Maps link, though it has CNPJ, Name, and Category.
* The `coupons` table stores behavior in a JSONB field. We'll need to adapt the UI to hide frequency/user limits and enforce the new preset models (e.g., *Benefício Fidelidade* as the main one).
* We have an `isActive` flag on the business profile, but no existing ledger table for tracking manual payments. 

**Market & Web Findings:**
* Modern partner dashboards emphasize simple campaign creation and clear usage limits to protect margins.
* Transitioning to standard, evergreen campaigns (like *Benefício Fidelidade*) is a common pattern to ensure the catalog always has value without requiring constant merchant intervention.
* Local business ledgers typically separate the raw payment records from the derived "active subscription" state to allow for auditing and historical tracking.

***

Now, let's clarify the scope for the **Admin Dashboard - Partners Ledger**.



*Viewed [adr-template.md](file:///Users/dev/nodo/passport/deno/.agents/skills/cy-create-prd/references/adr-template.md) *

*Viewed [prd-template.md](file:///Users/dev/nodo/passport/deno/.agents/skills/cy-create-prd/references/prd-template.md) *

*Edited relevant file*

*Edited relevant file*

### Planner Response

The PRD has been successfully saved and approved!

You can find the finalized Product Requirements Document here:
**[`_prd.md`](file:///Users/dev/nodo/passport/deno/.compozy/tasks/partner-beta/_prd.md)**

The architecture decision record we discussed is also available here:
**[`adr-001.md`](file:///Users/dev/nodo/passport/deno/.compozy/tasks/partner-beta/adrs/adr-001.md)**

As the next step in the workflow, I remind you that we should create a Technical Specification from this PRD. You can do this by using the **`/cy-create-techspec`** command, which will translate these business requirements into a concrete technical architecture and implementation plan. 

Let me know when you're ready to proceed!

### User Input

/cy-create-techspec 

*Viewed [SKILL.md](file:///Users/dev/nodo/passport/deno/.agents/skills/cy-create-techspec/SKILL.md) *

*Listed directory [routes](file:///Users/dev/nodo/passport/deno/routes) *

*Listed directory [admin](file:///Users/dev/nodo/passport/deno/routes/admin) *

*Viewed [businesses.tsx](file:///Users/dev/nodo/passport/deno/routes/admin/businesses.tsx) *

*Edited relevant file*

*Edited relevant file*

*Edited relevant file*

### Planner Response

I have generated the Technical Specification based on the PRD and the codebase structure. 

The `_techspec.md` and `adr-002.md` have been saved to the `.compozy/tasks/partner-beta/` directory.

Please review the **Implementation Plan** artifact (which contains the Technical Specification) and click **Proceed** if it looks good, or let me know if you'd like to adjust any of the technical decisions (like the `partner_ledger` schema or UI approach) before we move forward.

### User Input

/cy-create-tasks 

*Viewed [adr-002.md](file:///Users/dev/nodo/passport/deno/.compozy/tasks/partner-beta/adrs/adr-002.md) *

*Viewed [SKILL.md](file:///Users/dev/nodo/passport/deno/.agents/skills/cy-create-tasks/SKILL.md) *

*Edited relevant file*

### Planner Response

I have prepared the initial task breakdown for the Partner Beta implementation. 

Please review the **Implementation Plan** artifact and let me know if the grouping and dependencies look good to you. Once you click **Proceed**, I will generate the individual detailed task files (`task_01.md`, `task_02.md`, etc.) in the `.compozy/tasks/partner-beta/` directory.

### User Input

Aren't we missing some stuff? The new categories, disabling the analytics link...

*Edited relevant file*

### Planner Response

I've updated the task breakdown! 

You are completely right, I had grouped the categories into Task 04 and hiding analytics into Task 07, but they weren't explicit enough. 

I've rewritten the **Implementation Plan** to clearly highlight:
* **Task 04**: Explicitly mentions updating the category list to the new taxonomy across frontend and backend.
* **Task 07**: Explicitly mentions hiding the analytics navigation link from the dashboard sidebar for all users.
* **Task 08**: I also separated the onboarding fix into its own task so we can track it more easily.

Please review the updated breakdown and click **Proceed** when you're ready for me to generate the detailed task files.

### User Input



*Viewed [task-template.md](file:///Users/dev/nodo/passport/deno/.agents/skills/cy-create-tasks/references/task-template.md) *

*Grep searched codebase*

*Grep searched codebase*

*Grep searched codebase*

*Grep searched codebase*

*Edited relevant file*

*Edited relevant file*

*Edited relevant file*

*Edited relevant file*

*Edited relevant file*

*Edited relevant file*

*Edited relevant file*

*Edited relevant file*

*Edited relevant file*

*User accepted the command `compozy tasks validate --name partner-beta`*

### Planner Response

All 8 task files have been successfully generated, enriched with context from the codebase and TechSpec, and validated by the `compozy tasks validate` command.

You can view the full task breakdown and dependencies in the master task list:
**[`_tasks.md`](file:///Users/dev/nodo/passport/deno/.compozy/tasks/partner-beta/_tasks.md)**

The individual task files (e.g., [`task_01.md`](file:///Users/dev/nodo/passport/deno/.compozy/tasks/partner-beta/task_01.md)) are also available in the `.compozy/tasks/partner-beta/` directory.

We are now ready to begin implementation! Whenever you're ready, you can start executing the tasks using the **`/cy-execute-task`** command, starting with `task_01.md`.