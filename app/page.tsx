'use client';

import { useEffect, useState } from 'react';
import { ChatInterface } from '@/components/chat/ChatInterface';

export default function Home() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if there's an existing session in localStorage
    const existingSessionId = localStorage.getItem('carmind_session_id');

    if (existingSessionId) {
      // Verify session still exists
      fetch(`/api/session?id=${existingSessionId}`)
        .then((res) => {
          if (res.ok) {
            setSessionId(existingSessionId);
            setLoading(false);
          } else {
            // Session expired or invalid, create new one
            createNewSession();
          }
        })
        .catch(() => createNewSession());
    } else {
      createNewSession();
    }
  }, []);

  const createNewSession = async () => {
    try {
      const response = await fetch('/api/session', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to create session');
      }

      const { data } = await response.json();
      setSessionId(data.id);
      localStorage.setItem('carmind_session_id', data.id);
      setLoading(false);
    } catch (err) {
      setError('Failed to initialize session. Please refresh the page.');
      setLoading(false);
    }
  };

  const handleNewSession = () => {
    localStorage.removeItem('carmind_session_id');
    setSessionId(null);
    setLoading(true);
    createNewSession();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing CarMind...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md">
          <div className="text-red-600 mb-4">
            <svg
              className="w-12 h-12 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2 text-center">
            Something went wrong
          </h2>
          <p className="text-gray-600 text-center mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  if (!sessionId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <p className="text-gray-600">Session not initialized</p>
      </div>
    );
  }

  return (
    <>
      <ChatInterface sessionId={sessionId} />

      {/* Floating Action Button - New Session */}
      <button
        onClick={handleNewSession}
        className="fixed bottom-24 right-6 bg-white text-gray-700 p-3 rounded-full shadow-lg hover:shadow-xl transition-shadow border border-gray-200"
        title="Start new session"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
      </button>
    </>
  );
}
