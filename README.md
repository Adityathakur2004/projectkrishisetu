# KrishiSetu - Agricultural Digital Ecosystem

KrishiSetu is a comprehensive digital platform that connects farmers, buyers, and service providers in a unified agricultural ecosystem. The platform offers marketplace functionality, transportation services, cold storage facilities, financial services, and AI-powered farming assistance.

## Features

### 🛒 Marketplace
- Buy and sell agricultural products
- Advanced search and filtering
- Real-time bidding system
- Quality grading and verification

### 🚛 Transport Services
- Book transportation for goods
- Multiple vehicle types
- Real-time tracking
- Insurance coverage

### ❄️ Cold Storage
- Reserve storage facilities
- Temperature monitoring
- Quality preservation
- Automated inventory management

### 💰 Financial Services
- Loan applications and approvals
- Government scheme access
- Digital invoicing
- Payment processing

### 🤖 AI Assistant
- Disease detection
- Crop yield prediction
- Market price forecasting
- Farming recommendations

### 👥 Farmer Producer Organizations (FPO)
- Create and join FPOs
- Collective bargaining
- Shared resources
- Government scheme benefits

## Technology Stack

### Backend
- **Node.js** with Express.js
- **MongoDB** for database
- **JWT** for authentication
- **Socket.io** for real-time communication
- **Nodemailer** for email services

### Frontend
- **React.js** with Material-UI
- **Redux Toolkit** for state management
- **Axios** for API calls
- **Socket.io-client** for real-time features

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- MongoDB
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/krishisetu.git
   cd krishisetu
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your configuration
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm start
   ```

4. **Database Setup**
   - Install MongoDB
   - Create database named `krishisetu`
   - The application will automatically create collections

## Environment Variables

### Backend (.env)
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/krishisetu
JWT_SECRET=your-super-secret-jwt-key
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

## API Documentation

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Marketplace
- `GET /api/marketplace/products` - Get all products
- `POST /api/marketplace/products` - Create product
- `GET /api/marketplace/products/:id` - Get product details
- `PUT /api/marketplace/products/:id` - Update product

### Transport
- `GET /api/transport` - Get transport services
- `POST /api/transport/:id/book` - Book transport

### Cold Storage
- `GET /api/coldstorage` - Get storage facilities
- `POST /api/coldstorage/:id/book` - Book storage

### Loans
- `POST /api/loans/apply` - Apply for loan
- `GET /api/loans/my-loans` - Get user's loans

### AI Services
- `POST /api/ai/disease-detection` - Detect crop diseases
- `GET /api/ai/price-prediction/:crop` - Get price predictions

## Project Structure

```
krishisetu/
├── backend/
│   ├── models/          # MongoDB models
│   ├── routes/          # API routes
│   ├── middleware/      # Custom middleware
│   ├── config/          # Configuration files
│   └── server.js        # Main server file
├── frontend/
│   ├── src/
│   │   ├── components/  # Reusable components
│   │   ├── pages/       # Page components
│   │   ├── slices/      # Redux slices
│   │   └── store/       # Redux store
│   └── public/          # Static files
└── README.md
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, email support@krishisetu.com or join our Discord community.

## Roadmap

- [ ] Mobile application
- [ ] Multi-language support
- [ ] Advanced analytics dashboard
- [ ] Integration with IoT devices
- [ ] Blockchain-based traceability
- [ ] Weather API integration
- [ ] SMS notifications

---

**KrishiSetu** - Empowering farmers with technology for a better tomorrow.
