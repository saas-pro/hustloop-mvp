import { useEffect, useState, createContext, useContext } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '@/lib/api';

export const socket: Socket = io(`${API_BASE_URL}`, {
    path: '/socket.io',
    transports: ['websocket'],
    autoConnect: false, // Don't connect until we check auth
    withCredentials: true
});

export function useSolutionStatusUpdates(solutionId: string, onStatusUpdate: (data: any) => void) {
    useEffect(() => {
        if (!solutionId) return;

        socket.emit('join_solution', { solutionId });

        const handleStatusUpdate = (data: any) => {
            if (data.solutionId === solutionId) {
                onStatusUpdate(data);
            }
        };

        socket.on('solution_status_updated', handleStatusUpdate);

        return () => {
            socket.emit('leave_solution', { solutionId });
            socket.off('solution_status_updated', handleStatusUpdate);
        };
    }, [solutionId, onStatusUpdate]);
}

export function useChallengeStatusUpdates(challengeId: string, onStatusUpdate: (data: any) => void) {
    useEffect(() => {
        if (!challengeId) return;

        // join event expects a string room name based on routes.py:4555
        socket.emit('join', `challenge_${challengeId}`);

        const handleStatusUpdate = (data: any) => {
            if (data.challengeId === challengeId) {
                onStatusUpdate(data);
            }
        };

        socket.on('solution_status_updated', handleStatusUpdate);

        return () => {
            // leave is not explicitly defined for challenge in routes.py, but we should off the listener
            socket.off('solution_status_updated', handleStatusUpdate);
        };
    }, [challengeId, onStatusUpdate]);
}

const SocketContext = createContext<Socket | null>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token && !socket.connected) {
            socket.connect();
        }

        const handleConnect = () => console.log('Socket connected');
        const handleDisconnect = () => console.log('Socket disconnected');

        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);

        return () => {
            socket.off('connect', handleConnect);
            socket.off('disconnect', handleDisconnect);
            socket.disconnect();
        };
    }, []);

    return (
        <SocketContext.Provider value={socket} >
            {children}
        </SocketContext.Provider>
    );
}

export function useSocket() {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within SocketProvider');
    }
    return context;
}
