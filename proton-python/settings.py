import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# API Keys
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")
STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY")
STRIPE_PUBLISHABLE_KEY = os.environ.get("STRIPE_PUBLISHABLE_KEY")

# Flask Config
SECRET_KEY = os.environ.get("SECRET_KEY")

# Validate critical configuration
if not GOOGLE_API_KEY:
    print("WARNING: GOOGLE_API_KEY not found in environment variables.")

if not STRIPE_SECRET_KEY:
    print("WARNING: STRIPE_SECRET_KEY not found in environment variables.")
