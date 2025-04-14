"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Button from "../../components/Button";

export default function CreateMixtape() {
  const { data: session } = useSession();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.name) {
      console.error("No user name found in session");
      return;
    }

    setIsLoading(true);
    try {
      console.log("Creating mixtape:", { title, description });
      const response = await fetch("/api/mixtapes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          createdBy: session.user.name,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to create mixtape: ${error}`);
      }

      const mixtape = await response.json();
      console.log("Mixtape created:", mixtape);
      router.push(`/create/${mixtape.id}/songs`);
    } catch (error) {
      console.error("Error creating mixtape:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-white text-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl mb-4">Please sign in to create a mixtape</h1>
          <Button variant="accent" onClick={() => router.push("/")}>
            Go to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black flex flex-col items-center pt-16 px-4">
      <div className="w-full max-w-md">
        <h1 className="text-6xl mb-8 font-serif text-center">
          Create Your Mixtape
        </h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="title" className="block text-lg">
              Mixtape Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#F47B3E] focus:border-transparent"
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="description" className="block text-lg">
              Description (Optional)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded bg-gray-50 h-32 focus:outline-none focus:ring-2 focus:ring-[#F47B3E] focus:border-transparent"
            />
          </div>
          <div className="flex justify-end space-x-4 mt-8">
            <Button 
              variant="secondary" 
              onClick={() => router.push("/")} 
              type="button"
            >
              Cancel
            </Button>
            <Button 
              variant="accent" 
              type="submit"
              disabled={isLoading || !title.trim()}
            >
              {isLoading ? "Creating..." : "Next: Add Songs"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
} 