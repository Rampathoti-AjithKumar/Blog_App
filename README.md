# Real-Time Blog App

This version upgrades the original LocalStorage blog to a full-stack application using:

- HTML, CSS, JavaScript
- Node.js + Express
- MySQL
- JWT authentication
- bcrypt password hashing
- Socket.IO real-time updates
- Multer for image/video uploads

## 1. Create the database

Open MySQL Workbench and run `database-schema.sql`.

## 2. Configure the backend

Open `backend/.env.example`, copy it as `.env`, and update the MySQL password.

Example:

```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=blog_app
JWT_SECRET=use_a_long_random_secret_here
CLIENT_URL=http://127.0.0.1:5500
```

## 3. Install backend packages

```bash
cd backend
npm install
npm run dev
```

The API will run on `http://localhost:5000`.

## 4. Run the frontend

Open the project folder in VS Code and use Live Server. Open the page through a URL such as:

`http://127.0.0.1:5500/index.html`

Do not double-click the HTML file. Use a local web server such as VS Code Live Server.

## 5. Current features

- User registration
- Login with JWT
- Password hashing with bcrypt
- Persistent users in MySQL
- Persistent posts in MySQL
- Image/video uploads
- Persistent likes
- Persistent comments
- Delete your own posts
- Real-time post, like, comment and delete updates using Socket.IO
- Responsive UI

## Note about Forgot Password

The original project showed the password from LocalStorage. That is not secure and is intentionally removed. A real forgot-password flow should use a short-lived reset token and email delivery. That can be added as a separate step.
