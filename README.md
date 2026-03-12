# WomenSafetyApp 🛡️✨

**Empowering safety through community, AI, and blockchain technology.**

WomenSafetyApp is a comprehensive, community-driven safety platform designed to provide women with immediate assistance, real-time tracking, and a supportive network of volunteers (Guardians). By leveraging AI for intelligent monitoring and the Shardeum blockchain for decentralized evidence logging, we aim to bridge the gap in emergency response times and community awareness.

---

## 🚀 Key Features

### 1. Advanced SOS System 🆘
- **Shake-to-SOS:** Trigger emergency alerts by simply shaking your phone.
- **Multi-Channel Alerts:** Automatically sends SMS and voice calls to emergency contacts via Twilio.
- **Smart Evidence Capture:** Silently records 30 seconds of high-quality audio and photos during an SOS event.
- **Route Monitoring:** Detects if you deviate from your expected route and triggers alerts automatically.

### 2. Citizen Guardian Network 🛡️🏘️
- **Community Rescuers:** Verified users can opt-in to become "Guardians" and receive alerts for emergencies within a 5km radius.
- **Active Alerts Feed:** A dedicated dashboard for Guardians to view ongoing SOS calls and respond instantly.
- **One-Tap Navigation:** Seamlessly routes volunteers to the victim's location via the integrated map.

### 3. Safety AI Chatbot 🤖🛡️
- **Instant Advice:** A built-in AI assistant to provide safety tips, legal information, and local helpline details.
- **Voice Interactions:** Accessible via voice commands for hands-free assistance.

### 4. Smart Map & Safe Zones 📍🗺️
- **Integrated Navigation:** View your route, safe zones (hospitals, police stations), and "unsafe spots" reported by the community.
- **Heatmaps:** Visualize incident density to plan safer travel routes.
- **Cab Sync:** Paste tracking links (Ola/Uber) to automatically sync your trip with the app's monitoring system.

### 5. Blockchain Integration (Shardeum Sphinx) 💎⛓️
- **Evidence Immutability:** Hash-based evidence (audio/photos) is logged on the Shardeum blockchain to prevent tampering.
- **Guardian Incentives:** (Beta) Earn SHM tokens for successfully responding to help requests and contributing to a safer neighborhood.

---

## 🛠️ Tech Stack

- **Mobile App:** [React Native](https://reactnative.dev/) (Expo)
- **State Management:** React Context API
- **Backend/Database:** [Supabase](https://supabase.com/) (Auth, PostgreSQL, Storage, Realtime)
- **Messaging:** [Twilio API](https://www.twilio.com/) (SMS & Voice)
- **Maps:** [Google Maps Platform](https://developers.google.com/maps) & [OpenStreetMap](https://www.openstreetmap.org/)
- **Blockchain:** [Shardeum Sphinx](https://shardeum.org/) (EVM-compatible Layer 1)
- **Admin Dashboard:** [React](https://reactjs.org/) (Vite)

---

## 📂 Project Structure

```text
WomenSafetyApp/
├── app/                  # Expo Router pages (Tabs & Root)
├── components/           # Reusable UI components (Modals, Buttons)
├── context/              # Global state (Settings, SafeRide)
├── hooks/                # Custom React hooks (Location, Shake)
├── utils/                # Helper functions (Supabase, Twilio, Shardeum)
├── admin-dashboard/      # React/Vite admin portal
└── assets/               # Branding, icons, and sounds
```

---

## ⚙️ Setup & Installation

### Prerequisites
- Node.js (v18+)
- Expo Go app on your mobile device
- [Supabase Account](https://supabase.com/)
- [Twilio Account](https://www.twilio.com/)

### Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/WomenSafetyApp.git
   cd WomenSafetyApp
   ```

2. **Install dependencies:**
   ```bash
   npm install
   cd admin-dashboard && npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory and add the following:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   EXPO_PUBLIC_TWILIO_SID=your_twilio_sid
   EXPO_PUBLIC_TWILIO_TOKEN=your_twilio_token
   EXPO_PUBLIC_TWILIO_NUMBER=your_twilio_phone_number
   GOOGLE_MAPS_API_KEY=your_google_maps_key
   ```

4. **Run the application:**
   ```bash
   npx expo start
   ```

5. **Start the Admin Dashboard:**
   ```bash
   cd admin-dashboard
   npm run dev
   ```

---

## 🤝 Contributing

We welcome contributions from the community! Whether you're a developer, designer, or safety expert, your help can make a difference. Please check out our [Contributing Guidelines](CONTRIBUTING.md) to get started.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Stay Safe. Stay Connected. Stay Empowered. 🛡️✨**
