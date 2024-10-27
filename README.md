# LLM-Mentor
LLM Mentor is a Chrome extension designed to interact with local LLM (Large Language Model) instances, providing a convenient interface to send prompts, receive responses, and manage settings. This project uses React with Material-UI (MUI) to create a user-friendly interface, and RxJS for reactive data handling.

![LLM-Mentor Icon](public/images/screenshot_icon.webp) 

## Features

- **Memory Tab**: Allows you to input and store a memory that will be prepended to each prompt as a system message.
- **LLM Mentor Tab**: Submit prompts to your LLM instance and receive responses, while tracking token usage and request time.
- **Settings Tab**: Customize settings such as API URL, model selection, max token limit, and temperature slider.
- **Real-time token usage and request time display**.

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) and [npm](https://www.npmjs.com/get-npm) installed on your machine.
- A locally running LLM instance (compatible with the OpenAI-like API format).

### Steps

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/LLM-Mentor.git
   cd LLM-Mentor
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Build the project**:
   ```bash
   npm run build
   ```

4. **Load the extension into Chrome**:
   - Open `chrome://extensions/`.
   - Enable "Developer mode" (toggle in the upper-right corner).
   - Click "Load unpacked" and select the `dist/` folder generated after running the build command.

5. **Run a Local LLM Instance**:
   Ensure your LLM instance is running locally, and the API endpoint is accessible (by default, it uses `http://localhost:1234/v1/chat/completions`).

## Usage

### Memory Tab
- Use the **Memory Tab** to input system memory that will be prepended to each prompt.
- This is particularly useful for long-term context or instructions for your LLM.

### LLM Mentor Tab
- Enter your prompt into the text field.
- Adjust settings such as max tokens and temperature using the **Settings Tab**.
- The response from the LLM will appear in the output field, with real-time token usage and request time displayed.

### Settings Tab
- Configure the API URL, model type, max token count, and temperature (slider for 0.00 to 1.00 values).
- Default values:
  - API URL: `http://localhost:1234/v1/chat/completions`
  - Model: `meta-llama-3.1-8b-instruct`
  - Max Tokens: `4096`
  - Temperature: `0.7`

It is expected that you load the model with LLM Studio and set the model based on that.

## Development

If you'd like to contribute or modify this project, follow these steps:

1. **Run in development mode**:
   ```bash
   npm start
   ```
   This will run the project with live-reloading in development mode.

2. **Build for production**:
   ```bash
   npm run build
   ```
   This will create an optimized production build.

## Dependencies

- **React**: For building the user interface.
- **Material-UI (MUI)**: For providing modern UI components.
- **RxJS**: For handling reactive programming, event streams, and state management.
- **Webpack**: For bundling the app.
- **Babel**: For compiling modern JavaScript.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Future Enhancements

- Add more advanced memory management features.
- Implement more settings such as stop sequences and frequency penalties.

## Contributing

Feel free to submit issues and pull requests! Contributions are welcome and appreciated. Please follow the guidelines in the [Contributing Guide](CONTRIBUTING.md) (if applicable).

## Author

Created by [Margus Martsepp](https://github.com/margusmartsepp).
