const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const News = require('../models/News');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');
const { getRedisClient } = require('../config/redis');

const isRedisEnabled = () => process.env.REDIS_ENABLED === 'true';

// GET /api/public/metrics
// Returns homepage metrics (projects, publications, lab members)
router.get(
  '/metrics',
  asyncHandler(async (req, res) => {
    const cacheKey = 'public:metrics:v1';
    if (isRedisEnabled()) {
      try {
        const redis = getRedisClient();
        const cached = await redis.get(cacheKey);
        if (cached) {
          return res.json(JSON.parse(cached));
        }
      } catch (_) { /* ignore cache errors */ }
    }

    const [researchProjects, publications, labMembers] = await Promise.all([
      // Count all projects as research projects for now
      Project.countDocuments({}),
      // Approximate publications by News items tagged as paper or category named Research
      News.countDocuments({ $or: [ { tags: 'paper' }, { categoryId: { $exists: true } } ] }),
      // Active lab members (exclude admin/community)
      User.countDocuments({ isActive: true, role: { $in: ['team_member', 'mentor', 'researcher'] } }),
    ]);

    const payload = {
      success: true,
      data: {
        counts: { researchProjects, publications, labMembers },
        labels: {
          researchProjects: `${researchProjects}+`,
          publications: `${publications}+`,
          labMembers: `${labMembers}+`,
        },
      },
    };

    if (isRedisEnabled()) {
      try {
        const redis = getRedisClient();
        await redis.setEx(cacheKey, 300, JSON.stringify(payload));
      } catch (_) { /* ignore cache errors */ }
    }

    res.json(payload);
  })
);

module.exports = router;



