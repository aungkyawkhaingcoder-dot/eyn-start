# EYN stores

Frontend is a separate project at `/Users/jojo/Desktop/eyn-store`.

## Data / migration

`20260921000100_add_stores` adds Store and StoreProduct. Existing auth, Product,
Order, and user data are retained. Store.ownerId is the tenant boundary.
Every private read/write is scoped to the authenticated user; request bodies
cannot set ownerId. Public reads only expose published catalog data belonging
to ACTIVE owners. Money is Decimal(12,2) serialized as strings.

Run `pnpm db:deploy`, then restart the backend. Do not use database reset.

## Endpoints

All private endpoints use existing authMiddleware / browser rotation:

- GET /api/v1/stores — own stores and product counts
- POST /api/v1/stores — create
- GET /api/v1/stores/:storeId — own store
- PUT /api/v1/stores/:storeId — update full settings
- GET/POST /api/v1/stores/:storeId/products — list/create
- PUT/DELETE /api/v1/stores/:storeId/products/:id — update/delete
- GET /api/v1/storefront/:slug — public published catalog

Store body: `{name,slug,description,currency,published}`. Supported currencies:
MMK/USD/THB. Slug: 3–60 alphanumeric/hyphen characters, normalized lowercase.
Product body: `{name,description,price,inventory,imageUrl,published}`. Price must
be a decimal string (at most 2 fractional digits), stock a nonnegative integer,
image URL empty or HTTPS. Unknown body fields are discarded.

Browser mutations require an allowed Origin; POST/PUT also require JSON.
Native x-platform:mobile uses the existing bearer + refresh-token transport.
Private responses are no-store; public responses no-store to make unpublish
immediately visible on subsequent requests. 404 hides cross-owner resources;
409 indicates a taken slug. Deleting a product is permanent and UI confirms it.

Initial scope is owner-only stores and catalog; no payment/order processing,
team roles, image uploads, domain mapping, or automatic account linking.
Product lists are currently unpaginated; introduce pagination before large catalogs.

## Reading order

1. `src/routes/v1/stores.ts` — endpoint and controller mapping.
2. `src/controller/storeController.ts` — named handler entry points, following authController.
3. `src/ControllerHandler/storeHandlers.ts` — request parameters, service calls, HTTP responses.
4. `src/services/store/storeServices.ts` — ownership checks and database operations.
5. `src/services/store/validation.ts` — ID/body validation and allowed fields.

`src/middleware/storeRequest.ts` holds private response cache headers and browser
Origin/JSON checks. Public storefront also uses the controller and handler layers.
