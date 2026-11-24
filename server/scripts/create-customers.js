// Creates two demo customers through the normal flow: each one registers with
// documents, then the admin approves them, which opens their account in the
// bank's database. Run with the server started: npm run create-customers
const api = process.env.API_URL || 'http://localhost:4000/api';
const admin = { email: process.env.ADMIN_EMAIL || 'admin@cosmora.bank', password: process.env.ADMIN_PASSWORD || 'CHANGE_ME' };
const password = process.env.CUSTOMER_PASSWORD || 'CHANGE_ME';

const customers = [
  { fullName: 'Aria Nova', email: 'aria@cosmora.bank', phone: '9876500001', dob: '1997-03-14', gender: 'Female', occupation: 'Designer',
    addressLine: '12 Orion Street', city: 'Chennai', state: 'Tamil Nadu', pincode: '600001', pan: 'ARIAN1234A', aadhaar: '111122223333', initialDeposit: '10000' },
  { fullName: 'Leo Orion', email: 'leo@cosmora.bank', phone: '9876500002', dob: '1994-11-02', gender: 'Male', occupation: 'Engineer',
    addressLine: '7 Nebula Lane', city: 'Bengaluru', state: 'Karnataka', pincode: '560001', pan: 'LEOOR5678B', aadhaar: '444455556666', initialDeposit: '10000' },
];

async function call(path, { token, body, form } = {}) {
  const response = await fetch(api + path, {
    method: body || form ? 'POST' : 'GET',
    headers: { ...(token && { Authorization: 'Bearer ' + token }), ...(body && { 'Content-Type': 'application/json' }) },
    body: form || (body && JSON.stringify(body)),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(result.error?.message || 'HTTP ' + response.status), { status: response.status });
  return result;
}

const config = await call('/config');
console.log(`Server mode: ${config.mode}${config.mode === 'firebase' ? ' (cosmora-bank-732ca Firestore)' : ' (local file, NOT Firestore)'}`);
const { token } = await call('/auth/sign-in', { body: admin });

for (const customer of customers) {
  const form = new FormData();
  for (const [key, value] of Object.entries({ ...customer, password, acceptTerms: 'true' })) form.append(key, value);
  form.append('idProof', new Blob(['%PDF-1.4\n% demo identity proof\n'], { type: 'application/pdf' }), 'identity-proof.pdf');
  form.append('addressProof', new Blob(['%PDF-1.4\n% demo address proof\n'], { type: 'application/pdf' }), 'address-proof.pdf');
  let uid;
  try {
    uid = (await call('/applications', { form })).uid;
  } catch (error) {
    if (error.status !== 409) throw error;
    console.log(`- ${customer.email} already exists, skipping`);
    continue;
  }
  const { profile } = await call(`/admin/applications/${uid}/decision`, { token, body: { action: 'APPROVE', note: 'Demo customer' } });
  console.log(`✓ ${customer.fullName} <${customer.email}>  account ${profile.accountNumber}  balance ₹${Number(customer.initialDeposit).toLocaleString('en-IN')}`);
}
console.log(`\nCustomer password: ${password}`);
