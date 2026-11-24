/**
 * Security Rules Specification Verification (Dirty Dozen Payloads)
 * Covers all 12 attack vectors documented in security_spec.md against firestore.rules.
 */

export const DIRTY_DOZEN_PAYLOADS = [
  {
    name: '01_privilege_escalation_user_create',
    path: 'users/attacker_uid',
    operation: 'create',
    auth: { uid: 'attacker_uid', email: 'attacker@example.com', email_verified: true },
    payload: { uid: 'attacker_uid', displayName: 'Attacker', email: 'attacker@example.com', role: 'ADMIN' },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '02_role_tampering_user_update',
    path: 'users/attacker_uid',
    operation: 'update',
    auth: { uid: 'attacker_uid', email: 'attacker@example.com', email_verified: true },
    payload: { role: 'ADMIN' },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '03_shadow_field_injection_trip',
    path: 'trips/trip_1',
    operation: 'create',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    payload: { ownerId: 'user_1', memberIds: ['user_1'], isFeaturedAdmin: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '04_identity_spoofing_trip_owner',
    path: 'trips/trip_2',
    operation: 'create',
    auth: { uid: 'attacker_uid', email: 'attacker@example.com', email_verified: true },
    payload: { ownerId: 'victim_uid', memberIds: ['victim_uid'] },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '05_orphaned_packing_item',
    path: 'packingItems/item_1',
    operation: 'create',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    payload: { tripId: 'nonexistent_trip', ownerId: 'user_1', memberIds: ['user_1'], name: 'Socks' },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '06_unauthorized_trip_read',
    path: 'trips/victim_trip',
    operation: 'get',
    auth: { uid: 'attacker_uid', email: 'attacker@example.com', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '07_pii_scraping_users_list',
    path: 'users',
    operation: 'list',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '08_id_poisoning',
    path: 'trips/bad$id!!',
    operation: 'create',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '09_timestamp_forgery',
    path: 'trips/trip_3',
    operation: 'create',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    payload: { createdAt: '2020-01-01T00:00:00Z' },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '10_immutable_owner_transfer',
    path: 'trips/trip_1',
    operation: 'update',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    payload: { ownerId: 'another_user' },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '11_oversized_member_array',
    path: 'trips/trip_4',
    operation: 'create',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    payload: { memberIds: Array.from({ length: 25 }, (_, i) => `u_${i}`) },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '12_unverified_admin_email_spoof',
    path: 'users',
    operation: 'list',
    auth: { uid: 'spoof_uid', email: 'anikasaida5@gmail.com', email_verified: false },
    expected: 'PERMISSION_DENIED',
  },
];
