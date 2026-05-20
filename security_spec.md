# Security Specification - OssManager

## Data Invariants
1. **Multi-Tenancy**: Every document (except system-wide configs like `licenses` and `users` metadata) MUST have a `tenantId`. A user can only access data where their `tenantId` (stored in their user profile) matches the document's `tenantId`.
2. **Role-Based Access Control (RBAC)**: 
    - `super_admin`: Full access to everything.
    - `tenant_admin`: Admin access within their tenant.
    - `professor`: Technical evaluation and class management.
    - `receptionist`: Finance and enrollment management.
    - `student`: Access to own profile, grades, and public tenant info (classes, products).
3. **Identity Integrity**: User's email in Auth MUST match the email in the `users` collection. Student records associated with an Auth user are identified by matching email.
4. **Relational Sync**: Sub-resources (like `installments` of a `sale`) must verify the parent exists and belongs to the same tenant.

## The Dirty Dozen Payloads

| # | Attack Vector | Payload/Action | Expected Result |
|---|---------------|----------------|-----------------|
| 1 | Identity Spoofing | `db.users.create({uid: "attacker", role: "admin", tenantId: "some_gym"})` | **DENIED** (Only SuperAdmin or restricted self-signup) |
| 2 | Tenant Escape | `db.students.get("other_gym_student_id")` | **DENIED** (tenantId mismatch) |
| 3 | PII Leak | `db.students.get("victim_id")` (where victim.email != attacker.email) | **DENIED** (PII restricted to owner/admin) |
| 4 | Resource Poisoning | `db.students.create({id: "A".repeat(1024), name: "Bad"})` | **DENIED** (isValidId fails) |
| 5 | Update Gap | `db.payments.update(id, {amount: 0})` on a Paid record | **DENIED** (Terminal state lock) |
| 6 | Ghost Field Injection | `db.students.update(id, {isVerified: true, name: "New Name"})` | **DENIED** (affectedKeys().hasOnly() fails) |
| 7 | Self-Promotion | `db.graduations.create({studentId: "my_id", belt: "Black"})` as a student | **DENIED** (Only Professor/Admin) |
| 8 | Attendance Fraud | `db.classes.update(classId, {presence: ["my_id"]})` for class in other tenant | **DENIED** (Tenant mismatch) |
| 9 | Subscription Hijack | `db.subscriptions.update(id, {amount: 0})` | **DENIED** (Amount immutable or restricted) |
| 10 | License Bypass | `db.licenses.get("any_id")` | **DENIED** (Only SuperAdmin) |
| 11 | Financial Tampering | `db.expenses.create({amount: 5000})` as a Professor | **DENIED** (Professor lacks finance perm) |
| 12 | System Field Modification | `db.settings.update(id, {updatedAt: "2000-01-01"})` | **DENIED** (Must use server timestamp) |

## Test Runner Plan
We will use `firestore.rules` alongside a comprehensive validation helper set to block these payloads.
