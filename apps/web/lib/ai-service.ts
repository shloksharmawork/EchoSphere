// apps/web/lib/ai-service.ts

export type VibeResult = {
    vibe: "Chill" | "Hype" | "Focused" | "Mysterious" | "Romantic" | "Energetic";
    intent?: string;
    recommendations: string[];
    confidence: number;
};

const MOCK_VIBES = ["Chill", "Hype", "Mysterious", "Energetic"] as const;

export async function analyzeVoice(audioUrl: string): Promise<VibeResult> {
    // Simulator for AI Analysis
    // In a real implementation, this would call an API (e.g., OpenAI Whisper + GPT-4o or a specialized periodic audio model)

    // Artificial delay to simulate processing
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Randomly determine parameters for demo purposes
    const randomVibe = MOCK_VIBES[Math.floor(Math.random() * MOCK_VIBES.length)];
    const isFoodRequest = Math.random() > 0.5;

    if (isFoodRequest) {
        return {
            vibe: "Energetic",
            intent: "Looking for Food",
            recommendations: ["Burger King", "Sushi Place", "Taco Truck"],
            confidence: 0.95
        }
    }

    return {
        vibe: randomVibe,
        intent: "General Chat",
        recommendations: [],
        confidence: 0.85,
    };
}
