# AegisCare Public Cloud Deployment Guide

To make the AegisCare Telemedicine platform accessible to anyone in any country, state, or network, we need to deploy the application to the public cloud.

This guide outlines the exact steps to host the database, backend API, and frontend client on the internet for free.

---

## 📋 Architecture of Public Deployment

*   **Database**: MongoDB Atlas (Free Cloud Hosted Database)
*   **Backend API**: Render (Free Web Service hosting)
*   **Frontend Client**: Vercel (Free Static Web App hosting)

---

## 🛠️ Step-by-Step Deployment Steps

### Step 1: Create a Cloud Database on MongoDB Atlas
1. Visit [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and register for a free account.
2. Create a new **Free Shared Cluster** (choose any cloud provider e.g., AWS, and region near you).
3. Under **Database Access**, create a user with a username and password.
4. Under **Network Access**, click **Add IP Address** and choose **Allow Access from Anywhere (0.0.0.0/0)** so Render can connect to it.
5. Go to **Database** -> click **Connect** -> choose **Drivers** -> copy your connection string (it will look like `mongodb+srv://<username>:<password>@cluster0.mongodb.net/telemedicine?retryWrites=true&w=majority`).
6. Replace `<username>` and `<password>` with your database user credentials. Keep this URL handy.

---

### Step 2: Push Your Project to GitHub
1. Open the terminal on your Mac in the project root directory (`/Users/mayankdubey/Documents/telecom`) and initialize Git:
   ```bash
   git init
   git add .
   git commit -m "initial commit"
   ```
2. Go to [GitHub](https://github.com), create a new private repository named `aegiscare-telemed`.
3. Link your local project to GitHub and push the code:
   ```bash
   git remote add origin <your-github-repo-url>
   git branch -M main
   git push -u origin main
   ```

---

### Step 3: Deploy the Backend API to Render
1. Visit [Render](https://render.com) and register using your GitHub account.
2. Click **New +** -> choose **Blueprint**. (Render will automatically detect the `render.yaml` configuration file we created in the root directory!).
3. Select your repository `aegiscare-telemed` and click **Connect**.
4. Render will prompt you for the Environment Variables. Configure them as follows:
   *   `MONGO_URI`: Enter the MongoDB Atlas Connection String from Step 1.
   *   `JWT_SECRET`: Enter any strong random password (e.g. `my_super_secret_jwt_key_123`).
   *   `GEMINI_API_KEY`: Enter your Google Gemini API Key.
5. Click **Apply**. Render will compile and start your backend service. Once it is running, copy the generated `.onrender.com` URL (e.g. `https://aegiscare-backend.onrender.com`).

---

### Step 4: Deploy the Frontend Client to Vercel
1. Visit [Vercel](https://vercel.com) and sign up using your GitHub account.
2. Click **Add New** -> choose **Project**.
3. Select your repository `aegiscare-telemed` and click **Import**.
4. In the configuration settings:
   *   Set the **Framework Preset** to `Vite`.
   *   Set the **Root Directory** to `frontend`.
5. Under **Environment Variables**, add:
   *   Key: `VITE_API_URL`
   *   Value: Enter your backend URL from Render (e.g. `https://aegiscare-backend.onrender.com`)
6. Click **Deploy**. Vercel will build the frontend and provide you with a public web URL (e.g. `https://aegiscare-frontend.vercel.app`) that anyone in the world can open on any device!
