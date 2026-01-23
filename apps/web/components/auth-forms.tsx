"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            await login(username, password);
            router.push("/");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-sm">
            <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    disabled={loading}
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Logging in..." : "Log In"}
            </Button>
        </form>
    );
}

export function SignupForm() {
    const [step, setStep] = useState(1); // 1: Phone, 2: OTP, 3: Details
    const [countryCode, setCountryCode] = useState("91"); // Default to India as requested
    const [phone, setPhone] = useState("");
    const [otp, setOtp] = useState("");
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [avatarUrl, setAvatarUrl] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const { signup, sendOtp, verifyOtp } = useAuth();
    const router = useRouter();

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const fullPhone = `+${countryCode}${phone}`;
            await (sendOtp as any)(fullPhone);
            setStep(2);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const fullPhone = `+${countryCode}${phone}`;
            await (verifyOtp as any)(fullPhone, otp);
            setStep(3);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        setError("");
        try {
            // Get presigned URL
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/upload-url`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contentType: file.type,
                    fileSize: file.size,
                }),
            });

            if (!res.ok) throw new Error("Failed to get upload URL");
            const { uploadUrl, url } = await res.json();

            // Upload to S3/MinIO
            const uploadRes = await fetch(uploadUrl, {
                method: "PUT",
                body: file,
                headers: { "Content-Type": file.type },
            });

            if (!uploadRes.ok) throw new Error("Upload failed");
            setAvatarUrl(url);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleFinalSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const fullPhone = `+${countryCode}${phone}`;
            await signup(username, email, fullPhone, countryCode, password, avatarUrl);
            router.push("/");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // ... (rest of helper functions)

    if (step === 1) {
        return (
            <form onSubmit={handleSendOtp} className="space-y-4 w-full max-w-sm">
                <div className="space-y-2 text-center mb-6">
                    <h2 className="text-xl font-bold">Step 1: Phone Verification</h2>
                    <p className="text-sm text-zinc-400">Select your country and enter your phone number.</p>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="flex gap-2">
                        <select
                            className="flex h-10 w-[100px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={countryCode}
                            onChange={(e) => setCountryCode(e.target.value)}
                            disabled={loading}
                        >
                            <option value="1">🇺🇸 +1</option>
                            <option value="44">🇬🇧 +44</option>
                            <option value="91">🇮🇳 +91</option>
                            <option value="81">🇯🇵 +81</option>
                            <option value="86">🇨🇳 +86</option>
                            <option value="49">🇩🇪 +49</option>
                        </select>
                        <Input
                            id="phone"
                            type="tel"
                            placeholder="1234567890"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                            required
                            disabled={loading}
                            className="flex-1"
                        />
                    </div>
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Sending..." : "Send OTP"}
                </Button>
            </form>
        );
    }

    if (step === 2) {
        return (
            <form onSubmit={handleVerifyOtp} className="space-y-4 w-full max-w-sm">
                <div className="space-y-2 text-center mb-6">
                    <h2 className="text-xl font-bold">Step 2: Enter OTP</h2>
                    <p className="text-sm text-zinc-400">Check your console for the mock OTP code.</p>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="otp">6-Digit Code</Label>
                    <Input
                        id="otp"
                        type="text"
                        placeholder="123456"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        required
                        disabled={loading}
                    />
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setStep(1)} disabled={loading}>Back</Button>
                    <Button type="submit" className="flex-1" disabled={loading}>
                        {loading ? "Verifying..." : "Verify OTP"}
                    </Button>
                </div>
            </form>
        );
    }

    return (
        <form onSubmit={handleFinalSignup} className="space-y-4 w-full max-w-sm">
            <div className="space-y-2 text-center mb-6">
                <h2 className="text-xl font-bold">Step 3: Account Details</h2>
            </div>

            <div className="flex flex-col items-center gap-4 mb-4">
                <div className="w-24 h-24 rounded-full border-2 border-dashed border-zinc-700 flex items-center justify-center overflow-hidden bg-zinc-900">
                    {avatarUrl ? (
                        <img src={avatarUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-xs text-zinc-500">Avatar</span>
                    )}
                </div>
                <Label htmlFor="avatar-upload" className="cursor-pointer text-emerald-500 hover:underline">
                    {loading ? "Uploading..." : "Upload Profile Photo"}
                    <Input
                        id="avatar-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={loading}
                    />
                </Label>
            </div>

            <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    disabled={loading}
                    minLength={3}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="email">Email (Gmail)</Label>
                <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    minLength={6}
                />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating account..." : "Complete Signup"}
            </Button>
        </form>
    );
}
