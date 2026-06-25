import React, { createContext, useContext, useState } from 'react';

const ChatContext = createContext<any>(null);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeSession, setActiveSession] = useState<any>(null);

  return (
    <ChatContext.Provider value={{ activeSession, setActiveSession }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChatContext = () => useContext(ChatContext);
