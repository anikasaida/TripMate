# TripMate Security Specification (Payload-First TDD)

## 1. Data Invariants
1. **User Isolation & RBAC**: A user can only read/write their own `/users/{userId}` document. Self-registration cannot assign `role: "ADMIN"`. Only verified admins (`request.auth.token.email == 'anikasaida5@gmail.com' && request.auth.token.email_verified == true` or existence in `/admins/{uid}`) may promote/demote roles or write `/admins/{uid}`.
2. **Trip Ownership & Bounded Membership**: Every `/trips/{tripId}` document must have `ownerId == request.auth.uid` on creation, `ownerId` inside bounded `memberIds` (`size() <= 20`), and immutable `ownerId` and `createdAt` on updates.
3. **Master Gate Parent Integrity**: Sub-resources (`packingItems`, `activities`, `expenses`, `travelDocuments`, `destinationVotes`, `tripNotes`, `journalEntries`) MUST reference an existing `/trips/{tripId}` via `exists()` / `get()` on `create`, and only trip owners or members listed on that parent trip may access or modify them.
4. **Strict Temporal & ID Validation**: Every `createdAt` equals `request.time` on create; every `updatedAt` equals `request.time` on create and update; all path IDs match `^[a-zA-Z0-9_\-]+$` (`<= 128` chars).
5. **No Blanket List Scraping**: All private collections enforce `resource.data` ownership/membership checks directly in `allow list`.

## 2. The "Dirty Dozen" Attack Payloads
1. **Privilege Escalation (User Create)**: `{ uid: "attacker", role: "ADMIN", ... }` -> `PERMISSION_DENIED`.
2. **Role Tampering (User Update)**: `{ role: "ADMIN" }` on `/users/attacker` -> `PERMISSION_DENIED`.
3. **Shadow Field Injection (Trip Create)**: `{ ..., isFeaturedAdmin: true }` -> `PERMISSION_DENIED` (`hasOnly` rejects).
4. **Identity Spoofing (Trip Create)**: `{ ownerId: "victim_uid", ... }` by `"attacker"` -> `PERMISSION_DENIED`.
5. **Orphaned Packing Item**: `{ tripId: "nonexistent_trip", ownerId: "attacker", ... }` -> `PERMISSION_DENIED`.
6. **Unauthorized Trip Read**: Attacker attempts `get` on `/trips/victim_trip` where `attacker` is not in `memberIds` -> `PERMISSION_DENIED`.
7. **PII Scraping (Users List)**: Attacker calls `list` on `/users` -> `PERMISSION_DENIED`.
8. **ID Poisoning**: Document creation at `/trips/bad$id!!` or 500-char ID -> `PERMISSION_DENIED`.
9. **Timestamp Forgery**: `{ ..., createdAt: "2020-01-01T00:00:00Z" }` instead of `request.time` -> `PERMISSION_DENIED`.
10. **Immutable Owner Transfer**: Update on `/trips/trip1` changing `ownerId` -> `PERMISSION_DENIED`.
11. **Oversized Array / String DoS**: `memberIds` with 25 items or `tripName` with 5000 chars -> `PERMISSION_DENIED`.
12. **Unverified Admin Email Spoof**: Token with `email: "anikasaida5@gmail.com"` and `email_verified: false` attempting admin write -> `PERMISSION_DENIED`.
