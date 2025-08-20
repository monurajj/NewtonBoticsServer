/* eslint-disable no-console */
require('dotenv').config();

const base = process.env.BASE_URL || 'http://localhost:3006';

async function req(path, { method = 'GET', token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch (_) { json = { raw: text }; }
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${JSON.stringify(json)}`);
  return json;
}

async function login(email, password) {
  const r = await req('/api/auth/login', { method: 'POST', body: { email, password } });
  return { token: r.data.tokens.accessToken, user: r.data.user };
}

async function main() {
  const out = [];
  const push = (msg) => out.push(msg) && console.log(msg);
  await req('/health'); push('Health OK');
  await req('/api/public/metrics'); push('Public metrics OK');
  await req('/api/newsletter/subscribe', { method: 'POST', body: { email: 'smoke@example.com' } });
  await req('/api/newsletter/unsubscribe', { method: 'DELETE', body: { email: 'smoke@example.com' } }); push('Newsletter OK');

  const admin = await login('monu2feb2004@gmail.com', 'Monu@2004'); push('Admin login OK');
  const mentor = await login('mentor@example.com', 'Mentor@2024'); push('Mentor login OK');
  const leader = await login('leader@example.com', 'Leader@2024'); push('Leader login OK');

  // Projects
  const pCreate = await req('/api/projects', { method: 'POST', token: admin.token, body: {
    title: 'Smoke Project', description: 'This is a smoke test project description long enough...',
    category: 'Testing', status: 'upcoming', teamLeaderId: leader.user.id, mentorId: mentor.user.id,
  }});
  const projectId = pCreate.data.project._id || pCreate.data.project.id; push('Project create OK');
  await req(`/api/projects/${projectId}`, { method: 'PUT', token: admin.token, body: { status: 'ongoing' } }); push('Project update OK');
  await req(`/api/projects/${projectId}/members`, { method: 'POST', token: mentor.token, body: { userId: admin.user.id, role: 'Coordinator' } }); push('Project add member OK');
  await req(`/api/projects/${projectId}/milestones`, { method: 'POST', token: leader.token, body: { title: 'Milestone 1', dueDate: new Date(Date.now()+3*864e5).toISOString() } }); push('Project milestone add OK');
  await req(`/api/projects/${projectId}`, { method: 'DELETE', token: mentor.token }); push('Project delete OK');

  // Workshops
  const wCreate = await req('/api/workshops', { method: 'POST', token: mentor.token, body: {
    title: 'Smoke Workshop', description: 'Basics workshop for smoke testing long enough to pass validation',
    instructorId: mentor.user.id, level: 'beginner', maxParticipants: 10,
    startDate: new Date(Date.now()+5*864e5).toISOString(), endDate: new Date(Date.now()+5*864e5+3*3600e3).toISOString(),
  }}); const workshopId = wCreate.data.item._id; push('Workshop create OK');
  await req(`/api/workshops/${workshopId}/register`, { method: 'POST', token: admin.token }); push('Workshop register OK');
  await req(`/api/workshops/${workshopId}/register`, { method: 'DELETE', token: admin.token }); push('Workshop unregister OK');
  await req(`/api/workshops/${workshopId}`, { method: 'DELETE', token: mentor.token }); push('Workshop delete OK');

  // Inventory
  const cat = await req('/api/inventory/categories', { method: 'POST', token: admin.token, body: { name: 'Smoke Category' } });
  const categoryId = cat.data.item._id; push('Inventory category create OK');
  const eq = await req('/api/inventory/equipment', { method: 'POST', token: admin.token, body: { name: 'Smoke Equipment', categoryId, currentQuantity: 2 } });
  const eqId = eq.data.item._id; push('Equipment create OK');
  await req(`/api/inventory/equipment/${eqId}/checkout`, { method: 'POST', token: admin.token, body: { quantity: 1 } }); push('Equipment checkout OK');
  await req(`/api/inventory/equipment/${eqId}/return`, { method: 'PUT', token: admin.token, body: {} }); push('Equipment return OK');
  await req(`/api/inventory/equipment/${eqId}`, { method: 'DELETE', token: mentor.token }); push('Equipment delete OK');
  await req(`/api/inventory/categories/${categoryId}`, { method: 'DELETE', token: mentor.token }); push('Inventory category delete OK');

  // Events
  const ev = await req('/api/events', { method: 'POST', token: mentor.token, body: {
    title: 'Smoke Event', description: 'Event for smoke tests', type: 'technical', startDate: new Date(Date.now()+2*864e5).toISOString(), endDate: new Date(Date.now()+2*864e5+2*3600e3).toISOString()
  }}); const eventId = ev.data.item._id; push('Event create OK');
  await req(`/api/events/${eventId}`, { method: 'PUT', token: mentor.token, body: { isFeatured: true } }); push('Event update OK');
  await req(`/api/events/${eventId}`, { method: 'DELETE', token: admin.token }); push('Event delete OK');

  // News
  const ncat = await req('/api/news/categories', { method: 'POST', token: mentor.token, body: { name: 'Smoke News' } });
  const ncatId = ncat.data.item._id; push('News category create OK');
  const news = await req('/api/news', { method: 'POST', token: mentor.token, body: { title: 'Smoke News Title', content: 'Long content for smoke news...', authorId: admin.user.id, categoryId: ncatId, isPublished: true, publishedAt: new Date().toISOString() } });
  const newsId = news.data.item._id; push('News create OK');
  await req(`/api/news/${newsId}`, { method: 'PUT', token: mentor.token, body: { isFeatured: true } }); push('News update OK');
  await req(`/api/news/${newsId}`, { method: 'DELETE', token: admin.token }); push('News delete OK');
  await req(`/api/news/categories/${ncatId}`, { method: 'DELETE', token: admin.token }); push('News category delete OK');

  // Media
  const mcat = await req('/api/media/categories', { method: 'POST', token: admin.token, body: { name: 'Smoke Media Cat' } });
  const mcatId = mcat.data.item._id; push('Media category create OK');
  const media = await req('/api/media', { method: 'POST', token: admin.token, body: { title: 'Smoke Image', fileUrl: 'https://example.com/img.jpg', fileType: 'image', uploadedBy: admin.user.id, categoryId: mcatId } });
  const mediaId = media.data.item._id; push('Media create OK');
  await req(`/api/media/${mediaId}`, { method: 'PUT', token: admin.token, body: { isFeatured: true } }); push('Media update OK');
  await req(`/api/media/categories/${mcatId}`, { method: 'PUT', token: admin.token, body: { description: 'Updated' } }); push('Media category update OK');
  await req(`/api/media/${mediaId}`, { method: 'DELETE', token: mentor.token }); push('Media delete OK');
  await req(`/api/media/categories/${mcatId}`, { method: 'DELETE', token: mentor.token }); push('Media category delete OK');

  // Project Requests
  const pr1 = await req('/api/project-requests', { method: 'POST', token: leader.token, body: { title: 'Smoke Request 1', description: 'Long desc for PR1', teamSize: 3, estimatedDurationMonths: 6 } });
  const pr1Id = pr1.data.item._id; push('PR create OK');
  await req(`/api/project-requests/${pr1Id}/approve`, { method: 'POST', token: mentor.token, body: {} }); push('PR approve OK');
  const pr2 = await req('/api/project-requests', { method: 'POST', token: leader.token, body: { title: 'Smoke Request 2', description: 'Long desc for PR2', teamSize: 2, estimatedDurationMonths: 3 } });
  const pr2Id = pr2.data.item._id;
  await req(`/api/project-requests/${pr2Id}/reject`, { method: 'POST', token: mentor.token, body: { reason: 'Insufficient budget' } }); push('PR reject OK');

  console.log('\nAll smoke checks passed.');
}

main().catch((e) => { console.error('Smoke failed:', e); process.exit(1); });



