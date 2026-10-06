# Phase 4: merchant onboarding and dashboard

The existing login/registration entry still lands at `/stores`. An authenticated account with no stores sees a first-store guide. Store creation reuses the existing subscriber-based StoreEditor, defaults to an unpublished draft, and routes to the saved store overview. Returning users retain their existing store list; owners may create multiple stores.

The overview's setup checklist derives progress from saved data: store identity, description, an in-stock published product, optional saved theme configuration, and publication. There is no local-only completion flag to lose on another device. Customization is optional; the default storefront remains usable. The checklist is guidance, not a new publishing restriction or approval policy. Unpublish/publish behavior remains in existing settings.

`GET /api/v1/stores/:storeId/dashboard` is protected by existing authentication and store request middleware. The service checks ownerId before reading order data, scopes every query to the store/owner, and reads one repeatable-read snapshot. It returns status counts, completed order product totals grouped by currency, and five recent order summaries (without address/phone). Counts include cancelled orders in total orders; completed value includes only COMPLETED orders and is not collected-payment revenue. Empty stores show zeros and no fabricated orders.

Dashboard fetching is isolated in MerchantDashboard: initial load, manual refresh and window focus refresh. It uses the merchant cache scope; no dashboard data is fetched in the editor/products/settings views. Input subscriptions remain field-local. No database schema or migration is added for onboarding progress.

Validation covers new-store creation, reload, settings save, dashboard retry/mobile layout, owner isolation, empty metrics and mixed-currency totals. Browser API responses are mocked. Actual database/Redis login and migration deployment still require environment validation; the prior business-role migration must be applied together with the API version before live use of merchant promotion.

Approval/suspension, business contact/legal fields, customer account management, persistent draft revisions, domain routing and admin management actions are not introduced by this phase.
