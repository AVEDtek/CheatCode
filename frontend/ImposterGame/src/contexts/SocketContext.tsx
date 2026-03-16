import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode
} from "react";

type MessageListener = (data: any) => void;

type SocketProviderProps = {
  children: ReactNode;
};

type SocketContextValue = {
  socket: WebSocket | null;
  isConnected: boolean;
  error: string;
  send: (request: { type: string;[key: string]: any }) => void;
  onMessage: (messageType: string, listener: MessageListener) => () => void;
};

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  isConnected: false,
  error: "",
  send: () => { },
  onMessage: () => () => { }
});

export default function SocketProvider({ children }: SocketProviderProps) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const listenersRef = useRef<Map<string, Set<MessageListener>>>(new Map());

  useEffect(() => {
    const wsUrl = 'ws://0.0.0.0:5173';
    // const wsUrl = import.meta.env.VITE_BACKEND_URL;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("WebSocket connected");
      setSocket(ws);
      setIsConnected(true);
      setError("");
    };

    ws.onerror = (event) => {
      console.error("WebSocket error:", event);
      setIsConnected(false);
      setError("Failed to connect to server");
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
      setIsConnected(false);
      setSocket(null);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Received:", data);

        const listeners = listenersRef.current.get(data.type);
        if (listeners) {
          listeners.forEach((listener) => listener(data));
        }
      } catch (e) {
        console.error("Failed to parse message:", e);
      }
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, []);

  const send = useCallback(
    (request: { type: string;[key: string]: any }) => {
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        console.error("Socket not connected");
        return;
      }

      console.log("Sending:", request);
      socket.send(JSON.stringify(request));
    },
    [socket]
  );

  const onMessage = useCallback(
    (messageType: string, listener: MessageListener) => {
      if (!listenersRef.current.has(messageType)) {
        listenersRef.current.set(messageType, new Set());
      }

      listenersRef.current.get(messageType)!.add(listener);

      return () => {
        listenersRef.current.get(messageType)?.delete(listener);
      };
    },
    []
  );

  const value: SocketContextValue = {
    socket,
    isConnected,
    error,
    send,
    onMessage
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
}