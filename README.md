# NewtonBotics Backend Server 🚀

A comprehensive backend server for the NewtonBotics Robotics Club Management System, built with Node.js, Express.js, and MongoDB.

## ✨ Features

- **🔐 Secure Authentication**: JWT-based authentication with role-based access control
- **👥 User Management**: Complete user profiles with roles and permissions
- **📊 Project Management**: Full project lifecycle with team collaboration
- **🎓 Workshops & Events**: Workshop registration and event management
- **🔧 Inventory Management**: Equipment tracking and checkout system
- **📝 Project Requests**: Approval workflow for new projects
- **📰 News & Updates**: Content management system
- **🖼️ Media Gallery**: File upload and media management
- **💬 Communication**: Internal messaging and contact forms
- **⚡ Real-time Updates**: WebSocket support with Socket.IO
- **📈 Analytics**: Comprehensive reporting and statistics
- **🔒 Security**: Rate limiting, input validation, and security headers

## 🏗️ Architecture

```
src/
├── config/          # Configuration files
│   ├── database.js  # MongoDB connection
│   ├── redis.js     # Redis connection
│   └── socket.js    # Socket.IO setup
├── middleware/      # Custom middleware
│   ├── auth.js      # Authentication & authorization
│   └── errorHandler.js # Error handling
├── models/          # Mongoose models
│   ├── User.js      # User model
│   ├── Project.js   # Project model
│   └── ...          # Other models
├── routes/          # API routes
│   ├── auth.js      # Authentication routes
│   ├── users.js     # User management
│   └── ...          # Other route files
├── utils/           # Utility functions
│   └── logger.js    # Winston logger
└── server.js        # Main server file
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- MongoDB 7.0+
- Redis 6.0+
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd newtonbotics-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

4. **Database setup**
   ```bash
   # Start MongoDB
   mongod
   
   # Start Redis
   redis-server
   ```

5. **Run the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

The server will start on `http://localhost:3000`

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
NODE_ENV=development
PORT=3000
HOST=localhost

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/newtonbotics
MONGODB_URI_TEST=mongodb://localhost:27017/newtonbotics_test

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Security Configuration
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 📊 Database Models

### User Model
- **Roles**: student, team_member, mentor, researcher, community, admin
- **Permissions**: Granular permission system for different operations
- **Profile**: Complete user profile with skills, preferences, and settings

### Project Model
- **Status**: upcoming, ongoing, completed, on_hold
- **Team Management**: Team members with roles and responsibilities
- **Milestones**: Project milestones with tracking and dependencies
- **Progress**: Automatic progress calculation based on milestones

### Workshop Model
- **Categories**: Different workshop types and difficulty levels
- **Registration**: Participant management and attendance tracking
- **Materials**: Resource links and video recordings

### Equipment Model
- **Inventory**: Equipment tracking with quantities and locations
- **Checkout System**: Equipment borrowing with due dates
- **Maintenance**: Maintenance schedules and history

## 🔐 Authentication & Authorization

### JWT Tokens
- **Access Token**: Short-lived (24h) for API access
- **Refresh Token**: Long-lived (7d) for token renewal
- **Token Blacklisting**: Secure logout with Redis-based blacklisting

### Role-Based Access Control
```javascript
// Example middleware usage
const { requireRole, requirePermission } = require('./middleware/auth');

// Require specific role
router.get('/admin', requireRole('admin'), adminController);

// Require specific permission
router.post('/projects', requirePermission('write:projects'), createProject);
```

### Permission System
- **read:projects** - View projects
- **write:projects** - Create/edit projects
- **delete:projects** - Delete projects
- **approve:requests** - Approve project requests
- **manage:users** - User management
- **system:admin** - System administration

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - User logout
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Password reset
- `GET /api/auth/me` - Get current user info

### Users
- `GET /api/users` - List users (admin only)
- `GET /api/users/:id` - Get user profile
- `PUT /api/users/:id` - Update user profile
- `DELETE /api/users/:id` - Delete user (admin only)

### Projects
- `GET /api/projects` - List projects
- `GET /api/projects/:id` - Get project details
- `POST /api/projects` - Create project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Workshops
- `GET /api/workshops` - List workshops
- `POST /api/workshops/:id/register` - Register for workshop
- `DELETE /api/workshops/:id/register` - Unregister from workshop

### Inventory
- `GET /api/inventory/equipment` - List equipment
- `POST /api/inventory/equipment/:id/checkout` - Checkout equipment
- `PUT /api/inventory/equipment/:id/return` - Return equipment

## 🔌 Real-time Features

### Socket.IO Events
```javascript
// Client connection
socket.on('project:subscribe', (projectId) => {
  // Subscribe to project updates
});

// Server emits
io.emit('project:updated', projectData);
io.emit('workshop:registration', workshopId, userId);
io.emit('inventory:low_stock', equipmentData);
```

### WebSocket Events
- **Project Updates**: Real-time project progress updates
- **Workshop Registrations**: Live registration notifications
- **Inventory Changes**: Equipment status updates
- **System Notifications**: General system announcements

## 🧪 Testing

### Run Tests
```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Test Structure
```
tests/
├── unit/           # Unit tests
├── integration/    # Integration tests
├── e2e/           # End-to-end tests
└── fixtures/      # Test data
```

## 📈 Performance & Monitoring

### Caching Strategy
- **Redis**: Session storage and caching
- **MongoDB Indexes**: Optimized database queries
- **Response Caching**: API response caching

### Monitoring
- **Winston Logging**: Structured logging with different levels
- **Performance Metrics**: Response time and throughput tracking
- **Error Tracking**: Comprehensive error logging and monitoring

### Rate Limiting
- **Global Limits**: 100 requests per 15 minutes
- **Auth Endpoints**: 5 requests per 15 minutes
- **Speed Limiting**: Progressive delays for high-frequency requests

## 🚀 Deployment

### Production Build
```bash
# Build the application
npm run build

# Start production server
npm start
```

### Docker Deployment
```dockerfile
# Build image
docker build -t newtonbotics-backend .

# Run container
docker run -p 3000:3000 newtonbotics-backend
```

### Environment Variables for Production
```env
NODE_ENV=production
MONGODB_URI=mongodb://production-db:27017/newtonbotics
REDIS_HOST=production-redis
JWT_SECRET=very-long-secure-secret-key
```

## 🔒 Security Features

### Input Validation
- **Express Validator**: Request body validation
- **Joi Schema**: Complex validation rules
- **XSS Protection**: Cross-site scripting prevention
- **SQL Injection**: MongoDB injection prevention

### Security Headers
- **Helmet.js**: Security headers middleware
- **CORS**: Cross-origin resource sharing
- **Rate Limiting**: DDoS protection
- **Input Sanitization**: HTML and script tag removal

### File Upload Security
- **File Type Validation**: Allowed file types
- **Size Limits**: Maximum file size restrictions
- **Virus Scanning**: File security checks
- **Secure Storage**: Cloud storage integration

## 📚 API Documentation

### Swagger/OpenAPI
The API documentation is available at `/api-docs` when running in development mode.

### Postman Collection
Import the Postman collection from `docs/postman/` for easy API testing.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style
- **ESLint**: Code linting and formatting
- **Prettier**: Code formatting
- **Husky**: Pre-commit hooks

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Documentation
- [API Reference](docs/api.md)
- [Database Schema](docs/database.md)
- [Deployment Guide](docs/deployment.md)

### Issues
- [GitHub Issues](https://github.com/your-org/newtonbotics-backend/issues)
- [Discord Community](https://discord.gg/newtonbotics)

### Contact
- **Email**: support@newtonbotics.com
- **Website**: https://newtonbotics.com
- **Discord**: NewtonBotics Community

## 🎯 Roadmap

### Phase 2 (Q2 2024)
- [ ] AI-powered project recommendations
- [ ] Advanced analytics dashboard
- [ ] Mobile app API endpoints
- [ ] External system integrations

### Phase 3 (Q3 2024)
- [ ] Machine learning integration
- [ ] Blockchain credential verification
- [ ] IoT lab monitoring
- [ ] Multi-language support

---

**Built with ❤️ by the NewtonBotics Team**

*Empowering the next generation of robotics innovators*
# NewtonBoticsServer
