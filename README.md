# 🎓 ECampus - The Smart Campus Super App

![ECampus Banner](https://via.placeholder.com/1200x400.png?text=ECampus+-+Your+Campus+in+Your+Pocket)

## 📖 The Idea
**ECampus** is designed to be the ultimate "Super App" for university life. Instead of forcing students to use multiple different portals for classes, notices, social updates, and campus services, ECampus brings everything together into a single, beautifully designed, mobile-first web application. 

It acts as a digital twin of the university campus, bridging academics (Timetables, Announcements), campus social life (Hotposts, Student Discovery), and utility (Mini-Apps, Plastic Logs) into one seamless ecosystem.

---

## ✨ Key Features & Working Modules

### 1. 📱 Dynamic Dashboard
The dashboard serves as the daily command center for students.
* **Hotposts (Location-Based Stories):** A unique, Instagram-style horizontal story feed. Instead of personal stories, these are tied to campus locations (e.g., Canteen, Library, Eco Park). Students can share photos to these "Hotposts" so others can see real-time campus activity.
* **Smart Time Table:** A real-time daily schedule tracker that shows "Up Next" classes and features a dynamic progress bar that calculates how much of the academic day is completed.

### 2. 📢 Campus Updates
A centralized digital noticeboard categorizing announcements into:
* **Events:** Fests, symposiums, and guest lectures.
* **Notices:** Urgent campus updates like library closures or maintenance.
* **Academics:** Registration deadlines, exam schedules, and fee notices.

### 3. 🔍 Search & Mini-Apps Hub
The central utility hub of the app, designed to be scalable so new features can be added as "Mini-Apps" without cluttering the main UI.
* **Current Mini-Apps:**
  * 📅 **Timetable:** Detailed weekly academic schedules.
  * ♻️ **Plastic Log:** A sustainability tracker for monitoring individual or campus-wide plastic usage/recycling.
  * 🗳️ **Elections:** Portal for student council voting and candidate manifestos.
  * 🎬 **Movies:** Booking portal for campus auditorium movie screenings.
  * ⚽ **Sports:** Updates on varsity games, turf bookings, and intramural scores.
  * 🤖 **AI Bots:** Chatbots to assist students with campus FAQs, academic doubts, or navigation.
* **Discover Students:** A networking feature to find, connect, and collaborate with peers across different departments.

### 4. 👤 Profile & Personalization
* Comprehensive student profiles (ID, Course, Profile Picture).
* **Dark Mode Toggle:** Seamless switching between Light and Dark themes for better accessibility.
* Secure authentication and session management.

---

## 🛠️ Tech Stack

**Frontend:**
* **HTML5 & CSS3:** Semantic markup and modern styling.
* **Tailwind CSS:** Used via CDN for rapid, responsive, and utility-first UI design. Container queries and dark-mode plugins enabled.
* **Vanilla JavaScript:** For DOM manipulation, tab switching, and dynamic UI updates (no heavy frameworks required).
* **Google Fonts & Icons:** 'Inter' typeface for clean typography and 'Material Symbols' for scalable, modern iconography.

**Backend & Database (BaaS):**
* **Supabase:** Used as the backend-as-a-service.
  * **PostgreSQL Database:** To store user data, hotposts, and schedules.
  * **Supabase Auth:** Handles secure student login/signup.

---

## ⚙️ How It Works (Architecture)

1. **Single Page Application (SPA) Feel:** The app uses vanilla JavaScript to hide/show different sections (`view-dashboard`, `view-updates`, `view-search`, `view-profile`) without reloading the browser. This provides a lightning-fast, app-like experience on mobile devices.
2. **Component Isolation:** The HTML is structured modularly. The bottom navigation bar controls state, adding an `active` class to the current tab and displaying the relevant section ID.
3. **Responsive Design:** Tailwind's utility classes ensure the UI scales perfectly from mobile screens up to desktop monitors, though the UI is specifically optimized with a `max-w-screen-md` container to mimic a mobile app environment.
4. **Data Integration:** The `supabase.js` and `main.js` files handle connecting the frontend UI elements to the cloud database, fetching real-time notifications, user profiles, and schedule data.

---

## 🚀 Getting Started (Local Setup)

To run this project locally on your machine:

### Prerequisites
* A modern web browser (Chrome, Edge, Safari, Firefox).
* A local server (like the VS Code "Live Server" extension) to prevent CORS errors when fetching modules.

### Installation Steps
1. **Clone the repository:**
   ```bash
   git clone [https://github.com/yourusername/ecampus.git](https://github.com/yourusername/ecampus.git)
   cd ecampus
