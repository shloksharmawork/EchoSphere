import useSWR from 'swr';

interface User {
    id: string;
    username: string;
}

interface AuthResponse {
    user: User | null;
}

const fetcher = async (url: string) => {
    const res = await fetch(url, {
        credentials: 'include'
    });
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json();
};

export function useAuth() {
    const { data, error, mutate } = useSWR<AuthResponse>(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/me`,
        fetcher,
        {
            revalidateOnFocus: false,
            shouldRetryOnError: false
        }
    );

    const login = async (username: string, password: string) => {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ username, password })
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Login failed');
        }

        const result = await res.json();
        mutate({ user: result.user });
        return result;
    };

    const signup = async (username: string, password: string) => {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ username, password })
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Signup failed');
        }

        const result = await res.json();
        mutate({ user: result.user });
        return result;
    };

    const logout = async () => {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        });
        mutate({ user: null });
    };

    return {
        user: data?.user,
        isLoading: !error && !data,
        isError: error,
        login,
        signup,
        logout
    };
}
