# Kdufoot - SmartCoach Pro 2026

Kdufoot is an advanced tactical analysis and club management platform for football (soccer). Powered by AI (Google Gemini flash-3.0), it allows coaches to extract exercises from videos, manage club database information, and organize training sessions.

## 🚀 Key Features

- **AI Tactical Analysis**: Transform any football video into structured tactical exercises with SVG diagrams and detailed coaching points.
- **Club Lookup**: Official SIRET/SIREN search for French football clubs via government APIs.
- **Exercise Library**: A searchable database of drills and training sessions.
- **Stripe Integration**: Professional payment system for premium features.
- **Dynamic Training Builder**: Create and share training sessions with a modern, responsive UI.
- **OAuth Authentication**: Secure login via Google and FFF (Fédération Française de Football).

## 🛠 Tech Stack

- **Backend**: Python, Flask, Flask-Session
- **AI**: Google GenAI SDK (Gemini Flash models)
- **Frontend**: HTML5, Vanilla JS, CSS (Custom Stadium Theme)
- **APIs**: Stripe, Google OAuth, Recherche Entreprises API (Gouv.fr)
- **Utilities**: `yt-dlp` for video processing, `python-dotenv` for configuration.

## 📦 Installation

1. **Clone the repository**:
   ```bash
   git clone <your-repo-url>
   cd projet_philippe
   ```

2. **Set up a virtual environment**:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure Environment Variables**:
   Create a `.env` file in the root directory (based on the provided template):
   ```env
   GOOGLE_API_KEY=your_google_api_key
   STRIPE_SECRET_KEY=your_stripe_secret_key
   STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
   SECRET_KEY=your_flask_session_key
   ```

## 🚦 Usage

Start the Flask development server:
```bash
python app.py
```
The application will be available at `http://localhost:5000`.

## 🔒 Security

- Sensitive credentials are managed via environment variables and excluded from version control via `.gitignore`.
- Session data is handled securely using `Flask-Session`.

## 📄 License

This project is private and intended for the SmartCoach Pro 2026 ecosystem.
