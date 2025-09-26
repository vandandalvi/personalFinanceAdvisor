
import { useState } from "react";
import axios from "axios";

const AGENT_NAME = "FinAgent";
const AGENT_AVATAR = "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"; // Professional avatar
const USER_AVATAR = "https://cdn-icons-png.flaticon.com/512/1946/1946429.png";

function App() {
  const [file, setFile] = useState(null);
  const [messages, setMessages] = useState([
    {
      role: "bot",
      text: `Hello! I’m ${AGENT_NAME}, your personal finance assistant. Upload your bank CSV and ask me anything about your spending, savings, or financial habits.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    setLoading(true);
    try {
      await axios.post("/upload", formData);
      setMessages((prev) => [
        ...prev,
        {
          role: "system",
          text: "CSV uploaded successfully! You can now ask questions like: 'Where can I save money?', 'What is my total spending?', or 'Show my highest transaction.'",
        },
      ]);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Upload failed";
      setMessages((prev) => [
        ...prev,
        { role: "system", text: `Upload error: ${msg}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    const userText = input.trim();
    if (!userText) return;
    setLoading(true);
    setMessages((prev) => [
      ...prev,
      { role: "user", text: userText },
    ]);
    setInput("");
    try {
      const res = await axios.post("/chat", { query: userText });
      const bot = res?.data?.response ?? "(no response)";
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: bot },
      ]);
    } catch (err) {
      const msg = err?.response?.data?.response || err?.message || "Request failed";
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: `Error: ${msg}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
  <div className="fixed inset-0 w-screen h-screen bg-gradient-to-br from-blue-50 to-green-50 flex">
      {/* Sidebar */}
  <aside className="hidden md:flex flex-col w-64 bg-gradient-to-b from-blue-700 to-green-600 text-white p-6 shadow-lg h-full min-h-screen">
        <div className="flex items-center mb-8">
          <img src={AGENT_AVATAR} alt="Agent" className="w-14 h-14 rounded-full border-4 border-white shadow" />
          <div className="ml-4">
            <h2 className="text-2xl font-bold">{AGENT_NAME}</h2>
            <p className="text-sm opacity-80">Your Financial Agent</p>
          </div>
        </div>
        <div className="mt-8">
          <h3 className="font-semibold mb-2">Sample Questions</h3>
          <ul className="space-y-2 text-sm opacity-90">
            <li>• Where can I save money?</li>
            <li>• What is my total spending?</li>
            <li>• How much did I spend on Food?</li>
            <li>• Show my highest transaction</li>
            <li>• How much in September 2025?</li>
          </ul>
        </div>
        <div className="mt-auto text-xs opacity-70 pt-8">AI-Powered Personal Finance Assistant</div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-2 md:p-6 h-full min-h-screen">
        <div className="w-full max-w-4xl bg-white/80 rounded-xl shadow-xl flex flex-col h-[90vh] min-h-[500px]">
          {/* Header */}
          <div className="flex items-center border-b px-6 py-4 bg-gradient-to-r from-blue-600 to-green-500 rounded-t-xl">
            <img src={AGENT_AVATAR} alt="Agent" className="w-10 h-10 rounded-full border-2 border-white" />
            <span className="ml-3 text-lg font-semibold text-white tracking-wide">{AGENT_NAME} Chat</span>
          </div>

          {/* Chat Window */}
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 bg-gradient-to-br from-blue-50 to-green-50">
            {messages.map((m, i) => {
              if (m.role === "user") {
                return (
                  <div key={i} className="flex justify-end items-end">
                    <div className="flex flex-col items-end max-w-[70%]">
                      <div className="bg-blue-100 text-blue-900 rounded-2xl px-4 py-2 shadow mb-1">
                        {m.text}
                      </div>
                      <img src={USER_AVATAR} alt="You" className="w-7 h-7 rounded-full border-2 border-blue-300" />
                    </div>
                  </div>
                );
              }
              if (m.role === "bot" || m.role === "system") {
                return (
                  <div key={i} className="flex items-end">
                    <img src={AGENT_AVATAR} alt="Agent" className="w-7 h-7 rounded-full border-2 border-green-300 mr-2" />
                    <div className="bg-green-100 text-green-900 rounded-2xl px-4 py-2 shadow max-w-[70%]">
                      {m.text}
                    </div>
                  </div>
                );
              }
              return null;
            })}
            {loading && (
              <div className="flex items-end">
                <img src={AGENT_AVATAR} alt="Agent" className="w-7 h-7 rounded-full border-2 border-green-300 mr-2" />
                <div className="bg-green-100 text-green-900 rounded-2xl px-4 py-2 shadow max-w-[70%] animate-pulse">
                  Working...
                </div>
              </div>
            )}
          </div>

          {/* File Upload & Input */}
          <div className="border-t px-6 py-4 bg-white rounded-b-xl flex flex-col md:flex-row items-center gap-2">
            <div className="flex items-center gap-2 w-full md:w-auto">
              <input
                type="file"
                className="block text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                onChange={(e) => setFile(e.target.files[0])}
              />
              <button
                disabled={!file || loading}
                className="p-2 px-4 bg-blue-600 text-white rounded-full font-semibold shadow disabled:opacity-50"
                onClick={handleUpload}
              >
                Upload CSV
              </button>
            </div>
            <form
              className="flex flex-1 gap-2 mt-2 md:mt-0"
              onSubmit={e => { e.preventDefault(); handleSend(); }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 border border-gray-300 p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Ask a question..."
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="p-2 px-4 bg-green-600 text-white rounded-full font-semibold shadow disabled:opacity-50"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
