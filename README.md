# Expressions: Emotion Tracking & AI Assistant

Expressions is a mobile application designed to help users explore, understand, and reflect on their emotions. It combines facial emotion recognition technology with an AI-powered chat assistant to provide a unique and personal experience for emotional well-being.

Key features include:
- Analyzing emotions from photos taken with the camera or uploaded from the gallery.
- Engaging in conversations with an AI emotional assistant that considers your recent emotional states.
- Tracking your emotional history and gaining insights (feature in development).
- Secure user authentication and data privacy.
- Customizable app theme (light/dark mode).

## Features

-   **Facial Emotion Recognition**:
    -   Capture photos directly through the app's camera interface.
    -   Upload existing images from your device gallery.
    -   Utilizes a machine learning model to analyze facial expressions and identify primary emotions (e.g., happy, sad, angry, surprised).
    -   Displays confidence scores for detected emotions.
-   **AI Emotional Assistant**:
    -   Engage in text-based conversations with an intelligent AI assistant.
    -   The assistant can help you explore your feelings, offer supportive responses, and provide a space for reflection.
    -   It takes into account your recently analyzed emotions from photos to offer more personalized interactions.
-   **User Authentication**:
    -   Secure account creation and login using email/password.
    -   Password reset and change functionalities.
-   **Emotion History & Insights (Planned)**:
    -   View a history of your analyzed emotions over time.
    -   Gain insights into your emotional patterns and trends (this feature is currently under development and insights will be available via the `StatsScreen`).
-   **Theme Customization**:
    -   Personalize your app experience with light and dark theme options.
-   **Cross-Platform**:
    -   Built with React Native and Expo, allowing for compatibility with both iOS and Android devices.

## Tech Stack

-   **Frontend**:
    -   [React Native](https://reactnative.dev/): A JavaScript framework for building native mobile apps.
    -   [Expo](https://expo.dev/): A platform and toolset for React Native development, simplifying builds and development workflows.
    -   [TypeScript](https://www.typescriptlang.org/): A typed superset of JavaScript that enhances code quality and maintainability.
    -   [React Navigation](https://reactnavigation.org/): For routing and navigation within the app.
    -   [React Native Paper](https://callstack.github.io/react-native-paper/): A UI component library implementing Material Design.
-   **Backend & Services**:
    -   [Supabase](https://supabase.io/): An open-source Firebase alternative for database, authentication, and storage.
        -   *Supabase Auth*: Manages user authentication (email/password, social logins if implemented).
        -   *Supabase Database*: Stores user data, emotion analysis results, and chat history.
    -   [Hugging Face Inference API](https://huggingface.co/inference-api): Used for accessing the facial emotion recognition model.
    -   [ChatGPT API (via RapidAPI)](https://rapidapi.com/): Powers the AI emotional assistant's conversational abilities.
-   **State Management**:
    -   React Context API: For managing global state like theme preferences.
-   **Styling**:
    -   Styled Components (via `globalStyles.ts` and component-specific styles).
    -   Expo Linear Gradient for gradient effects.

## Setup and Installation

To get Expressions running on your local machine, follow these steps:

**1. Prerequisites:**

*   **Node.js:** Make sure you have Node.js (LTS version recommended) installed. You can download it from [nodejs.org](https://nodejs.org/).
*   **npm or Yarn:** npm is included with Node.js. Yarn can be installed from [yarnpkg.com](https://classic.yarnpkg.com/en/docs/install).
*   **Expo CLI:** Install the Expo CLI globally by running:
    ```bash
    npm install -g expo-cli
    ```
    (or `yarn global add expo-cli`)
*   **Git:** Ensure Git is installed on your system.

**2. Clone the Repository:**

```bash
git clone https://github.com/your-username/expressions.git # Replace with the actual repository URL
cd expressions
```

**3. Install Dependencies:**

Install the project dependencies using npm or yarn:

```bash
npm install
```

or

```bash
yarn install
```

**4. Environment Variables:**

This project requires API keys and configuration for Supabase and the AI services.

*   Create a new file named `.env` in the root of the project.
*   Add the following environment variables to your `.env` file, replacing the placeholder values with your actual keys:

    ```env
    EXPO_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
    EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY

    # For the Hugging Face Inference API (used in endpointhf.tsx)
    # You might need to configure this directly in the code or set it up as an environment variable
    # if the code is refactored to use one. For now, check `endpointhf.tsx`.
    # Example:
    # HUGGING_FACE_API_KEY=YOUR_HUGGING_FACE_API_KEY
    # HUGGING_FACE_API_URL=YOUR_HUGGING_FACE_INFERENCE_ENDPOINT_URL

    # For the ChatGPT API (via RapidAPI, used in screens/AssistantChatScreen.tsx)
    # These are typically used as headers in the API call.
    # The current implementation has them hardcoded.
    # It's highly recommended to move these to environment variables.
    # Example:
    # RAPIDAPI_KEY=YOUR_RAPIDAPI_KEY
    # RAPIDAPI_HOST=YOUR_RAPIDAPI_HOST
    ```

    **Note on API Keys:**
    *   **Supabase:** Get your URL and Anon Key from your Supabase project settings.
    *   **Hugging Face:** The `endpointhf.tsx` file seems to directly use a token. For better security and configurability, this should be moved to an environment variable. The current implementation uses `HF_TOKEN`. You should create this token in your Hugging Face account settings.
    *   **ChatGPT (RapidAPI):** The `AssistantChatScreen.tsx` has API keys hardcoded. This is **not recommended for production or shared code**. You should abstract these into environment variables and load them similarly.

**5. Running the App:**

*   **Start the Expo development server:**
    ```bash
    expo start
    ```
*   This will open a new tab in your web browser with the Expo Developer Tools.
*   **Running on a physical device:**
    *   Install the "Expo Go" app on your iOS or Android device.
    *   Scan the QR code shown in the Expo Developer Tools or in your terminal using the Expo Go app.
*   **Running on an emulator/simulator:**
    *   Make sure you have Android Studio (for Android Emulator) or Xcode (for iOS Simulator) installed and configured.
    *   From the Expo Developer Tools in your browser, click "Run on Android device/emulator" or "Run on iOS simulator."
    *   Alternatively, you can use the following commands in your terminal:
        ```bash
        expo run:android
        ```
        ```bash
        expo run:ios
        ```
        (These commands may require additional setup if you haven't built a development client before.)

## Usage Guide

1.  **Sign Up / Log In:**
    *   On launching the app, you'll be prompted to create a new account or log in with existing credentials.
2.  **Home Screen - Analyze Emotions:**
    *   Navigate to the "Home" or "Analyze" tab.
    *   Tap the **camera icon** to take a new photo.
    *   Tap the **gallery icon** to choose an existing photo from your device.
    *   Up to 5 images can be selected for analysis.
    *   Once an image is displayed, tap the **send icon** to submit it for emotion analysis.
    *   The app will display the detected emotion and a confidence score.
    *   You can delete uploaded photos using the **delete icon**.
3.  **Assistant Chat Screen:**
    *   Go to the "Chat" or "Assistant" tab.
    *   Here you can type messages to the AI emotional assistant.
    *   The assistant will respond, taking into account your recent emotion analysis results (if any) to provide more relevant conversation.
    *   You can clear your chat history using the delete icon in the header.
4.  **Profile & Settings:**
    *   Access your profile to manage account details, such as changing your password.
    *   Toggle between light and dark themes in the settings or profile section.
5.  **View Emotion Statistics (Stats Screen):**
    *   Explore the "Stats" tab to see visualizations and summaries of your recorded emotions over time (Note: This section might still be under development).

## Contributing

Contributions are welcome! If you'd like to improve Expressions, please consider the following:

*   **Reporting Bugs:**
    *   If you find a bug, please open an issue on the GitHub repository.
    *   Describe the bug in detail, including steps to reproduce it, the expected behavior, and the actual behavior.
    *   Include screenshots or screen recordings if possible.
*   **Suggesting Features:**
    *   If you have an idea for a new feature or an enhancement to an existing one, please open an issue to discuss it.
    *   Clearly describe the feature and its potential benefits to users.
*   **Pull Requests:**
    *   For minor fixes or improvements, feel free to submit a pull request directly.
    *   For larger changes, it's best to discuss them in an issue first to ensure they align with the project's goals.
    *   Please ensure your code follows the existing coding style and includes tests where appropriate.

We appreciate your help in making Expressions better!

## License

This project is currently not licensed.

It is recommended to add a `LICENSE` file to the project root to define how others can use, modify, and distribute the code. A common choice for open-source projects is the [MIT License](https://opensource.org/licenses/MIT).
