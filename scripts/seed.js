/* eslint-disable no-console */
require('dotenv').config();
const mongoose = require('mongoose');

const User = require('../src/models/User');
const Project = require('../src/models/Project');
const Workshop = require('../src/models/Workshop');
const Event = require('../src/models/Event');
const EquipmentCategory = require('../src/models/EquipmentCategory');
const Equipment = require('../src/models/Equipment');
const NewsCategory = require('../src/models/NewsCategory');
const News = require('../src/models/News');
const MediaCategory = require('../src/models/MediaCategory');
const Media = require('../src/models/Media');
const MediaCollection = require('../src/models/MediaCollection');
const ContactSubmission = require('../src/models/ContactSubmission');
const InternalMessage = require('../src/models/InternalMessage');
const ProjectRequest = require('../src/models/ProjectRequest');
const RoleApproval = require('../src/models/RoleApproval');

async function connect() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/newtonbotics';
  await mongoose.connect(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
  });
  console.log('Connected to MongoDB');
}

async function ensureUser({ email, password, role, firstName, lastName, department, yearOfStudy, phone, emailVerified = true }) {
  let user = await User.findOne({ email });
  if (!user) {
    user = new User({
      email,
      passwordHash: password,
      role,
      firstName,
      lastName,
      department,
      yearOfStudy,
      phone,
      emailVerified,
      isActive: true,
    });
  } else {
    user.role = role;
    user.firstName = firstName;
    user.lastName = lastName;
    user.department = department;
    user.yearOfStudy = yearOfStudy;
    user.phone = phone;
    user.emailVerified = emailVerified;
    user.isActive = true;
    // set new password (pre-save will hash)
    user.passwordHash = password;
  }
  await user.save();
  console.log(`Seeded user: ${email} (${role})`);
  return user;
}

async function seedProjects({ mentor, teamLeader, members }) {
  const existing = await Project.find({ title: { $in: ['Autonomous Rover', 'Robotic Arm', 'AI Vision System'] } });
  if (existing.length > 0) {
    console.log('Projects already exist, skipping project seeding');
    return existing;
  }

  const projects = [];

  const chassisDue = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);
  const sensorsDue = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);

  projects.push(new Project({
    title: 'Autonomous Rover',
    description: 'Design and build an autonomous rover capable of navigating obstacle courses using SLAM.',
    category: 'Robotics',
    status: 'ongoing',
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    budget: 5000,
    mentorId: mentor._id,
    teamLeaderId: teamLeader._id,
    achievements: ['Won campus demo day'],
    tags: ['ros', 'slam', 'lidar'],
    milestones: [
      { title: 'Chassis Assembly', description: 'Assemble rover body', dueDate: chassisDue, status: 'completed', completedAt: chassisDue },
      { title: 'Sensor Integration', description: 'Integrate LIDAR and IMU', dueDate: sensorsDue, status: 'completed', completedAt: sensorsDue },
      { title: 'SLAM Tuning', description: 'Tune SLAM parameters', dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), status: 'in_progress' },
    ],
    teamMembers: [
      { userId: members[0]._id, role: 'Developer', skills: ['C++', 'ROS2'] },
      { userId: members[1]._id, role: 'Hardware', skills: ['Electronics'] },
    ],
  }));

  projects.push(new Project({
    title: 'Robotic Arm',
    description: 'Develop a 6-DOF robotic arm with inverse kinematics and vision-based pick-and-place.',
    category: 'Automation',
    status: 'upcoming',
    startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    budget: 3000,
    mentorId: mentor._id,
    teamLeaderId: teamLeader._id,
    milestones: [
      { title: 'CAD Design', description: 'Design arm in CAD', dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
    ],
    teamMembers: [
      { userId: members[0]._id, role: 'Designer' },
    ],
  }));

  const modelSelDue = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
  const edgeOptDue = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

  projects.push(new Project({
    title: 'AI Vision System',
    description: 'Real-time object detection pipeline optimized for edge devices.',
    category: 'AI/ML',
    status: 'completed',
    startDate: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    budget: 2000,
    mentorId: mentor._id,
    teamLeaderId: teamLeader._id,
    achievements: ['Published internal whitepaper'],
    milestones: [
      { title: 'Model Selection', dueDate: modelSelDue, status: 'completed', completedAt: modelSelDue },
      { title: 'Edge Optimization', dueDate: edgeOptDue, status: 'completed', completedAt: edgeOptDue },
    ],
    teamMembers: [
      { userId: members[1]._id, role: 'ML Engineer', skills: ['Python', 'TensorRT'] },
    ],
  }));

  const saved = await Project.insertMany(projects);
  console.log(`Seeded ${saved.length} projects`);
  return saved;
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
  console.log(`Seeded role approval: ${normalizedEmail} -> [${approval.allowedRoles.join(', ')}]`);
  return approval;
}

async function seedWorkshops({ instructor, attendees }) {
  const exists = await Workshop.findOne({ title: 'Intro to ROS2' });
  if (exists) {
    console.log('Workshops already exist, skipping workshop seeding');
    return;
  }

  const ws = new Workshop({
    title: 'Intro to ROS2',
    description: 'Basics of ROS2, nodes, topics, and navigation stack.',
    instructorId: instructor._id,
    category: 'Robotics',
    level: 'beginner',
    maxParticipants: 30,
    currentParticipants: 2,
    startDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
    location: 'Lab 101',
    status: 'upcoming',
    registrations: attendees.map((u) => ({ userId: u._id })),
  });
  await ws.save();
  console.log('Seeded 1 workshop');
}

async function seedEvents({ organizer, attendees }) {
  const count = await Event.countDocuments();
  if (count > 0) {
    console.log('Events already exist, skipping event seeding');
    return;
  }
  const baseDate = new Date();
  const events = [
    {
      title: 'Robotics Showcase',
      description: 'Expo featuring student and mentor projects.',
      category: 'showcase',
      type: 'showcase',
      startDate: new Date(baseDate.getTime() + 15 * 24 * 60 * 60 * 1000),
      endDate: new Date(baseDate.getTime() + 15 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000),
      location: 'Main Auditorium',
      maxCapacity: 200,
      currentRegistrations: attendees.length,
      organizerId: organizer._id,
      status: 'upcoming',
      registrations: attendees.map((u) => ({ userId: u._id })),
    },
    {
      title: 'Weekly Tech Talk',
      description: 'Members share ongoing research and learnings.',
      category: 'technical',
      type: 'technical',
      startDate: new Date(baseDate.getTime() - 2 * 24 * 60 * 60 * 1000),
      endDate: new Date(baseDate.getTime() - 2 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
      location: 'Seminar Hall 2',
      maxCapacity: 50,
      currentRegistrations: 20,
      organizerId: organizer._id,
      status: 'completed',
    },
    {
      title: 'Hackathon Night',
      description: 'Overnight buildathon for rapid prototyping.',
      category: 'competition',
      type: 'competition',
      startDate: new Date(baseDate.getTime() + 2 * 24 * 60 * 60 * 1000),
      endDate: new Date(baseDate.getTime() + 2 * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000),
      location: 'Innovation Lab',
      maxCapacity: 80,
      currentRegistrations: 10,
      organizerId: organizer._id,
      status: 'upcoming',
      isFeatured: true,
    },
    {
      title: 'Community Networking',
      description: 'Meet alumni and partners for collaboration opportunities.',
      category: 'networking',
      type: 'networking',
      startDate: new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000),
      endDate: new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
      location: 'Cafe Terrace',
      maxCapacity: 120,
      currentRegistrations: 0,
      organizerId: organizer._id,
      status: 'upcoming',
    },
  ];
  await Event.insertMany(events);
  console.log(`Seeded ${events.length} events`);
}

async function seedInventory() {
  const exists = await Equipment.findOne({ name: 'NVIDIA Jetson Nano' });
  if (exists) {
    console.log('Inventory already exists, skipping inventory seeding');
    return;
  }

  const catBoards = await EquipmentCategory.create({ name: 'Development Boards', description: 'MCUs and SBCs' });
  const catSensors = await EquipmentCategory.create({ name: 'Sensors', description: 'LIDAR, Cameras, IMU' });

  await Equipment.create([
    {
      name: 'NVIDIA Jetson Nano',
      description: 'Edge AI development board',
      categoryId: catBoards._id,
      manufacturer: 'NVIDIA',
      purchaseDate: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000),
      purchasePrice: 99,
      currentQuantity: 5,
      minQuantity: 2,
      location: 'Shelf A1',
      status: 'available',
      specifications: { ram: '4GB', storage: 'microSD' },
    },
    {
      name: 'Realsense D435 Camera',
      description: 'Depth camera for vision tasks',
      categoryId: catSensors._id,
      manufacturer: 'Intel',
      purchaseDate: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
      purchasePrice: 179,
      currentQuantity: 3,
      minQuantity: 1,
      location: 'Shelf B2',
      status: 'available',
      specifications: { fps: 30, resolution: '1280x720' },
    },
  ]);

  console.log('Seeded inventory items and categories');
}

async function seedNews({ author }) {
  const count = await News.countDocuments();
  if (count > 0) {
    console.log('News already exist, skipping news seeding');
    return;
  }
  const catUpdates = await NewsCategory.create({ name: 'Updates', description: 'Club updates', color: '#0070f3' });
  const catResearch = await NewsCategory.create({ name: 'Research', description: 'Research outcomes', color: '#22c55e' });
  await News.create([
    { title: 'Welcome to the Semester', content: 'Kickoff meeting next week!', excerpt: 'Kickoff meeting next week!', categoryId: catUpdates._id, authorId: author._id, isPublished: true, publishedAt: new Date(), tags: ['welcome', 'kickoff'] },
    { title: 'New Paper Accepted', content: 'Our AI vision paper accepted at XYZ.', categoryId: catResearch._id, authorId: author._id, isPublished: true, publishedAt: new Date(), isFeatured: true, tags: ['ai', 'paper'] },
  ]);
  console.log('Seeded news and categories');
}

async function seedMedia({ uploader }) {
  const count = await Media.countDocuments();
  if (count > 0) {
    console.log('Media already exist, skipping media seeding');
    return;
  }
  const catPhotos = await MediaCategory.create({ name: 'Photos', description: 'Event photos' });
  const media1 = await Media.create({
    title: 'Team Photo',
    description: 'Showcase team picture',
    fileUrl: 'https://example.com/media/team-photo.jpg',
    thumbnailUrl: 'https://example.com/media/team-photo-thumb.jpg',
    fileType: 'image',
    fileSize: 1024 * 250,
    categoryId: catPhotos._id,
    uploadedBy: uploader._id,
    tags: ['team'],
    isFeatured: true,
  });
  await MediaCollection.create({
    name: 'Showcase Gallery',
    description: 'Photos from showcase',
    coverMediaId: media1._id,
    isPublic: true,
    createdBy: uploader._id,
    mediaItems: [{ mediaId: media1._id, position: 1 }],
  });
  console.log('Seeded media and collections');
}

async function seedContactsAndMessages({ admin, users }) {
  const csCount = await ContactSubmission.countDocuments();
  if (csCount === 0) {
    await ContactSubmission.create([
      { name: 'Prospective Student', email: 'student@example.com', subject: 'Join Club', message: 'How to join?', department: 'CSE', priority: 'low' },
      { name: 'Vendor', email: 'vendor@example.com', subject: 'Sponsorship', message: 'Interested in sponsoring', department: 'Admin', priority: 'high' },
    ]);
    console.log('Seeded contact submissions');
  }
  const imCount = await InternalMessage.countDocuments();
  if (imCount === 0) {
    await InternalMessage.create([
      { senderId: admin._id, recipientId: users[0]._id, subject: 'Welcome', message: 'Glad to have you on board!' },
      { senderId: users[0]._id, recipientId: admin._id, subject: 'Re: Welcome', message: 'Thank you!' },
    ]);
    console.log('Seeded internal messages');
  }
}

async function seedProjectRequests({ submitter, mentor, team }) {
  const prCount = await ProjectRequest.countDocuments();
  if (prCount > 0) {
    console.log('Project requests already exist, skipping');
    return;
  }
  await ProjectRequest.create([
    {
      title: 'Autonomous Drone Research',
      description: 'Investigate SLAM on micro drones.',
      objectives: ['Prototype drone', 'Implement SLAM'],
      expectedOutcomes: ['Workshop talk', 'Demo video'],
      teamSize: 4,
      estimatedDurationMonths: 6,
      budgetEstimate: 8000,
      requiredResources: ['Jetson', 'Camera'],
      mentorId: mentor._id,
      status: 'under_review',
      submittedBy: submitter._id,
      teamMembers: team.map((u) => ({ userId: u._id, proposedRole: 'Developer', availabilityHoursPerWeek: 8 })),
      resources: [{ resourceType: 'equipment', description: 'NVIDIA Jetson', estimatedCost: 400, priority: 'high' }],
    },
    {
      title: 'Humanoid Locomotion',
      description: 'Study bipedal balancing algorithms.',
      objectives: ['Simulation', 'Hardware prototype'],
      expectedOutcomes: ['Conference submission'],
      teamSize: 3,
      estimatedDurationMonths: 12,
      budgetEstimate: 15000,
      requiredResources: ['Lab Space'],
      mentorId: mentor._id,
      status: 'pending',
      submittedBy: submitter._id,
    },
    {
      title: 'IoT Lab Monitoring',
      description: 'Deploy sensors for environment monitoring.',
      objectives: ['Deploy sensors', 'Dashboard'],
      expectedOutcomes: ['Operational dashboard'],
      teamSize: 5,
      estimatedDurationMonths: 4,
      budgetEstimate: 5000,
      requiredResources: ['Sensors', 'Cloud'],
      status: 'approved',
      submittedBy: submitter._id,
      approvalDate: new Date(),
      startDate: new Date(),
    },
  ]);
  console.log('Seeded project requests');
}

async function main() {
  try {
    await connect();

    // Admin user per request
    const admin = await ensureUser({
      email: 'monu2feb2004@gmail.com',
      password: 'Monu@2004',
      role: 'admin',
      firstName: 'Monu',
      lastName: 'Kumar',
      department: 'Administration',
      phone: '+911234567890',
    });

    // Mentor, Team leader, and members
    const mentor = await ensureUser({
      email: 'mentor@example.com',
      password: 'Mentor@2024',
      role: 'mentor',
      firstName: 'Priya',
      lastName: 'Singh',
      department: 'Mechanical',
      phone: '+911112223334',
    });

    const leader = await ensureUser({
      email: 'leader@example.com',
      password: 'Leader@2024',
      role: 'team_member',
      firstName: 'Arjun',
      lastName: 'Verma',
      department: 'Electronics',
      yearOfStudy: 3,
      phone: '+919998887776',
    });

    const member1 = await ensureUser({
      email: 'dev1@example.com',
      password: 'Dev1@2024',
      role: 'team_member',
      firstName: 'Neha',
      lastName: 'Sharma',
      department: 'CSE',
      yearOfStudy: 2,
      phone: '+919911223344',
    });

    const member2 = await ensureUser({
      email: 'dev2@example.com',
      password: 'Dev2@2024',
      role: 'team_member',
    // Seed role approvals so future registrations for these emails can get elevated roles
    await ensureRoleApproval({ email: 'mentor@example.com', allowedRoles: ['mentor', 'team_member'], note: 'Core mentor' });
    await ensureRoleApproval({ email: 'leader@example.com', allowedRoles: ['team_member'], note: 'Team leader' });
    await ensureRoleApproval({ email: 'dev1@example.com', allowedRoles: ['team_member'], note: 'Approved team member' });
    await ensureRoleApproval({ email: 'dev2@example.com', allowedRoles: ['team_member'], note: 'Approved team member' });

      firstName: 'Ravi',
      lastName: 'Patel',
      department: 'ECE',
      yearOfStudy: 4,
      phone: '+919922334455',
    });

    await seedProjects({ mentor, teamLeader: leader, members: [member1, member2] });
    await seedWorkshops({ instructor: mentor, attendees: [leader, member1] });
    await seedEvents({ organizer: admin, attendees: [leader, member1, member2] });
    await seedInventory();
    await seedNews({ author: admin });
    await seedMedia({ uploader: admin });
    await seedContactsAndMessages({ admin, users: [leader, member1, member2] });
    await seedProjectRequests({ submitter: leader, mentor, team: [member1, member2] });

    console.log('Seeding complete.');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    try { await mongoose.disconnect(); } catch (_) {}
    process.exit(1);
  }
}

main();


