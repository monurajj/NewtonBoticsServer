/* eslint-disable no-console */
require('dotenv').config();
const mongoose = require('mongoose');

const RoleApproval = require('../src/models/RoleApproval');

async function connect() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/newtonbotics';
  await mongoose.connect(uri, {
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 5000,
  });
  console.log('Connected to MongoDB');
}

async function ensureRoleApproval({ email, allowedRoles, note }) {
  const normalizedEmail = email.toLowerCase();
  const update = {
    email: normalizedEmail,
    allowedRoles: Array.from(new Set(allowedRoles)),
    note,
    isActive: true,
  };
  const approval = await RoleApproval.findOneAndUpdate(
    { email: normalizedEmail },
    { $set: update },
    { upsert: true, new: true }
  );
  console.log(`Upserted role approval: ${approval.email} -> [${approval.allowedRoles.join(', ')}]`);
}

async function main() {
  try {
    await connect();

    await ensureRoleApproval({
      email: 'monu.k23csai@nst.rishihood.edu.in',
      allowedRoles: ['team_member'],
      note: 'Added via addRoleApprovals script',
    });

    await ensureRoleApproval({
      email: 'sonu2feb2004@gmail.com',
      allowedRoles: ['mentor'],
      note: 'Added via addRoleApprovals script',
    });

    await mongoose.disconnect();
    console.log('Done.');
    process.exit(0);
  } catch (err) {
    console.error('Failed to add role approvals:', err);
    try { await mongoose.disconnect(); } catch (_) {}
    process.exit(1);
  }
}

main();


