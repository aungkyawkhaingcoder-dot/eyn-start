# Business roles

`User.role` is the primary account role: CUSTOMER, MERCHANT or ADMIN. Merchants and administrators may also buy; checkout must not require a CUSTOMER-only role. Guest checkout and existing order relations remain unchanged.

New registrations default to CUSTOMER. Creating a store promotes CUSTOMER to MERCHANT in the same transaction; failed creation cannot leave a role change behind. ADMIN is never downgraded. Public input cannot choose ADMIN. Store management still checks ownerId on every resource, rather than granting all merchants access to all stores.

Migration mapping:
- ADMIN stays ADMIN, with or without a store.
- Legacy USER or AUTHOR with a Store becomes MERCHANT.
- Legacy USER or AUTHOR without a Store becomes CUSTOMER.
- Posts, orders, stores, credentials and IDs are retained. AUTHOR was not an enforced API role in the current implementation.

The migration is transactional and replaces the enum; deploy it with the corresponding generated Prisma client/application code. Coordinate API rollout because old code must not create USER/AUTHOR after migration. Run against a staging copy first and back up the database. This change does not run migrate deploy or change a live database. Historical migration consolidation still needs reconciliation for databases using the old migration chain.

Admin moderation, persistent draft/published revisions, domain mapping and customer-account order linking remain separate features. Do not infer customer order ownership by email alone.
